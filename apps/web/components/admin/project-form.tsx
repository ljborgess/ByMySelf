'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PROJECT_STATUSES, type ProjectStatus } from '@portfolio/shared';
import { Link, useRouter } from '../../i18n/navigation';
import type { AdminProject } from '../../lib/admin-projects';
import {
  createProject,
  updateProject,
  type SaveProjectResult,
} from '../../lib/admin-projects-client';
import {
  EMPTY_PROJECT_FORM,
  LOCALIZED_FIELDS,
  URL_FIELDS,
  missingTranslations,
  toFormValues,
  validateProjectForm,
  type LocalizedField,
  type ProjectFormErrors,
  type ProjectFormValues,
} from '../../lib/project-form';

/**
 * RF-PROJ1 e RF-PROJ2. O mesmo formulário para criar e para editar.
 *
 * Um componente só, e não dois: os campos, a validação e o payload são
 * idênticos — mudam o schema (create x update), o endpoint e o texto do
 * botão. Duas cópias divergiriam no primeiro campo novo, e o campo esquecido
 * seria justamente o da tela menos usada.
 *
 * Tailwind escrito à mão, como o resto do projeto. Sem biblioteca de
 * formulário: o estado é um objeto e a validação é uma chamada ao schema
 * compartilhado (lib/project-form.ts), então react-hook-form entraria para
 * trocar algumas linhas de `useState` por uma dependência e um segundo
 * modelo mental de validação. Os testes seguem a issue e olham o que é
 * renderizado e o payload enviado, não estado interno de biblioteca.
 *
 * Client component porque precisa de estado (erros, envio em andamento) e do
 * fetch com os cookies do browser.
 */
export function ProjectForm({
  project,
  dashboardPath,
  loginPath,
}: {
  /** Ausente cria; presente edita (RF-PROJ2). */
  project?: AdminProject;
  dashboardPath: string;
  loginPath: string;
}) {
  const t = useTranslations('adminProjectForm');
  const tStatus = useTranslations('adminProjects.status');
  const router = useRouter();

  const mode = project ? 'edit' : 'create';

  const [values, setValues] = useState<ProjectFormValues>(() =>
    project ? toFormValues(project) : EMPTY_PROJECT_FORM,
  );
  const [errors, setErrors] = useState<ProjectFormErrors>({});
  const [failure, setFailure] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [techDraft, setTechDraft] = useState('');

  const pending = useMemo(() => missingTranslations(values), [values]);

  /**
   * O erro de um campo, já em texto.
   *
   * Duas origens chegam no mesmo lugar: a validação local guarda uma *chave*
   * de mensagem (traduzível), e a API, quando recusa, devolve o texto dela
   * própria por campo. `t.has` separa os dois — sem isso, a mensagem crua da
   * API seria usada como chave e apareceria na tela como
   * `adminProjectForm.errors.O slug ... `.
   */
  function errorText(path: string): string | undefined {
    const raw = errors[path];
    if (raw === undefined) {
      return undefined;
    }
    return t.has(`errors.${raw}`) ? t(`errors.${raw}`) : raw;
  }

  function set<K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setLocalized(
    field: LocalizedField,
    locale: 'pt' | 'en',
    text: string,
  ) {
    setValues((current) => ({
      ...current,
      [field]: { ...current[field], [locale]: text },
    }));
  }

  function addTech() {
    const tech = techDraft.trim();
    // Duplicata é ruído: a mesma tecnologia duas vezes não diz nada a mais, e
    // apareceria repetida no card do site público.
    if (tech === '' || values.techStack.includes(tech)) {
      setTechDraft('');
      return;
    }
    set('techStack', [...values.techStack, tech]);
    setTechDraft('');
  }

  function removeTech(tech: string) {
    set(
      'techStack',
      values.techStack.filter((item) => item !== tech),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Uma tentativa por vez. Sem isso um clique duplo numa rede lenta manda
    // dois POST, e o segundo esbarra no slug que o primeiro acabou de usar.
    if (submitting) {
      return;
    }

    setFailure(undefined);

    const validation = validateProjectForm(values, mode);

    if (!validation.ok) {
      // Erro por campo, e nenhuma chamada à API: um payload que o schema
      // compartilhado recusa é o mesmo que a API recusaria.
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    const result: SaveProjectResult =
      validation.mode === 'edit'
        ? // `project` existe sempre que `mode` é 'edit' — é o que define o
          // modo —, mas isso é invariante do componente e não do tipo.
          await updateProject(project!.id, validation.payload)
        : await createProject(validation.payload);

    if (result.ok) {
      // `replace` e não `push`: depois de salvar, "voltar" deve levar de onde
      // a pessoa veio, não a um formulário com dados já gravados.
      router.replace(dashboardPath);
      // A listagem é Server Component; sem isto o cache de rota do cliente
      // poderia mostrar a tabela sem o que acabou de ser salvo.
      router.refresh();
      return;
    }

    if (result.reason === 'unauthenticated') {
      router.replace(loginPath);
      return;
    }

    if (result.reason === 'invalid' && result.fieldErrors) {
      // Não deveria acontecer — o formulário valida contra o mesmo schema. Se
      // acontecer, a mensagem da API vai para o campo em vez de virar um erro
      // genérico no topo.
      setErrors(result.fieldErrors);
    }

    setFailure(
      result.reason === 'conflict' || result.reason === 'invalid'
        ? // A API diz qual projeto está segurando o slug, e onde ele está;
          // texto fixo não diria.
          result.message || t('errors.rejected')
        : t('errors.unavailable'),
    );
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
      {/*
        User story 4: o que falta traduzir, visível de relance e nomeando os
        campos — "falta tradução" sozinho obrigaria a percorrer o formulário
        inteiro para descobrir onde.
      */}
      {pending.length > 0 && (
        <p className="rounded-md border border-amber-600/30 bg-amber-600/10 px-3 py-2 text-sm text-amber-200">
          {t('translationPending', {
            fields: pending.map((field) => t(`fields.${field}`)).join(', '),
          })}
        </p>
      )}

      <Section title={t('sections.identification')}>
        <Field
          id="slug"
          label={t('fields.slug')}
          required
          hint={t('hints.slug')}
          error={errorText('slug')}
        >
          {(props) => (
            <input
              {...props}
              type="text"
              value={values.slug}
              onChange={(event) => set('slug', event.target.value)}
              disabled={submitting}
              className={INPUT_CLASS}
            />
          )}
        </Field>
      </Section>

      <Section title={t('sections.content')}>
        {LOCALIZED_FIELDS.map((field) => (
          <div key={field} className="flex flex-col gap-4">
            <Field
              id={`${field}-pt`}
              label={t(`fields.${field}`)}
              required
              error={errorText(`${field}.pt`)}
            >
              {(props) =>
                renderTextControl({
                  props,
                  multiline: field === 'content',
                  value: values[field].pt,
                  onChange: (text) => setLocalized(field, 'pt', text),
                  disabled: submitting,
                })
              }
            </Field>

            <Field
              id={`${field}-en`}
              label={t(`fieldsEn.${field}`)}
              optionalLabel={t('optional')}
              error={errorText(`${field}.en`)}
            >
              {(props) =>
                renderTextControl({
                  props,
                  multiline: field === 'content',
                  value: values[field].en,
                  onChange: (text) => setLocalized(field, 'en', text),
                  disabled: submitting,
                })
              }
            </Field>
          </div>
        ))}
      </Section>

      <Section title={t('sections.techStack')}>
        {/*
          Entrada por etiqueta, e não um campo separado por vírgula: com
          vírgula, um espaço a mais ou uma vírgula final vira tecnologia vazia,
          e o erro só aparece depois de salvo. Aqui cada item existe ou não.
        */}
        <Field
          id="techStack"
          label={t('fields.techStack')}
          hint={t('hints.techStack')}
          error={errorText('techStack')}
        >
          {(props) => (
            <div className="flex gap-2">
              <input
                {...props}
                type="text"
                value={techDraft}
                onChange={(event) => setTechDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter num campo de texto submeteria o formulário inteiro;
                  // aqui adiciona a etiqueta, que é o que a tecla sugere.
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTech();
                  }
                }}
                disabled={submitting}
                className={`${INPUT_CLASS} flex-1`}
              />
              <button
                type="button"
                onClick={addTech}
                disabled={submitting}
                className={BUTTON_CLASS}
              >
                {t('addTech')}
              </button>
            </div>
          )}
        </Field>

        {values.techStack.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {values.techStack.map((tech) => (
              <li
                key={tech}
                className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-sm"
              >
                {tech}
                <button
                  type="button"
                  onClick={() => removeTech(tech)}
                  disabled={submitting}
                  // Nome acessível carrega a tecnologia: numa lista de oito,
                  // oito botões "Remover" são indistinguíveis para quem navega
                  // por lista de controles.
                  aria-label={t('removeTech', { tech })}
                  className="text-base leading-none opacity-60 transition-opacity hover:opacity-100 disabled:opacity-40"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t('sections.links')}>
        {URL_FIELDS.map((field) => (
          <Field
            key={field}
            id={field}
            label={t(`fields.${field}`)}
            optionalLabel={t('optional')}
            hint={
              field === 'coverImageUrl' ? t('hints.coverImageUrl') : undefined
            }
            error={errorText(field)}
          >
            {(props) => (
              <input
                {...props}
                type="url"
                inputMode="url"
                value={values[field]}
                onChange={(event) => set(field, event.target.value)}
                disabled={submitting}
                className={INPUT_CLASS}
              />
            )}
          </Field>
        ))}
      </Section>

      <Section title={t('sections.publication')}>
        <Field id="status" label={t('fields.status')}>
          {(props) => (
            <select
              {...props}
              value={values.status}
              onChange={(event) =>
                set('status', event.target.value as ProjectStatus)
              }
              disabled={submitting}
              className={INPUT_CLASS}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {tStatus(status)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="flex items-center gap-2">
          <input
            id="featured"
            name="featured"
            type="checkbox"
            checked={values.featured}
            onChange={(event) => set('featured', event.target.checked)}
            disabled={submitting}
            className="size-4"
          />
          <label htmlFor="featured" className="text-sm font-medium">
            {t('fields.featured')}
          </label>
        </div>

        <Field
          id="completedAt"
          label={t('fields.completedAt')}
          optionalLabel={t('optional')}
          hint={t('hints.completedAt')}
          error={errorText('completedAt')}
        >
          {(props) => (
            <input
              {...props}
              type="date"
              value={values.completedAt}
              onChange={(event) => set('completedAt', event.target.value)}
              disabled={submitting}
              className={INPUT_CLASS}
            />
          )}
        </Field>
      </Section>

      {failure && (
        // `role="alert"` para um leitor de tela anunciar a falha sem a pessoa
        // ter que voltar procurando o que mudou na página
        <p role="alert" className="text-sm text-red-400">
          {failure}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting} className={BUTTON_CLASS}>
          {submitting ? t('submitting') : t(`submit.${mode}`)}
        </button>

        {/*
          `Link` de i18n/navigation e não `next/link`: sem ele o href sai sem
          o prefixo de locale e cai fora da árvore de rotas.
        */}
        <Link
          href={dashboardPath}
          className="hover:text-accent text-sm underline underline-offset-4"
        >
          {t('cancel')}
        </Link>
      </div>
    </form>
  );
}

const INPUT_CLASS =
  'focus-visible:border-accent rounded-md border border-white/20 px-3 py-2 text-sm outline-none disabled:opacity-60';

const BUTTON_CLASS =
  'hover:border-accent rounded-md border border-white/20 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60';

interface ControlProps {
  id: string;
  name: string;
  'aria-required'?: true;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/**
 * `content` é markdown de página de detalhe e os outros dois são uma linha —
 * mas rótulo, erro e ligação acessível são iguais nos três, então só o
 * elemento muda.
 */
function renderTextControl({
  props,
  multiline,
  value,
  onChange,
  disabled,
}: {
  props: ControlProps;
  multiline: boolean;
  value: string;
  onChange: (text: string) => void;
  disabled: boolean;
}) {
  const shared = {
    ...props,
    value,
    disabled,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
  };

  return multiline ? (
    <textarea {...shared} rows={10} className={`${INPUT_CLASS} font-mono`} />
  ) : (
    <input {...shared} type="text" className={INPUT_CLASS} />
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 text-sm font-semibold tracking-wide uppercase opacity-70">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * O invólucro de um campo: rótulo, dica, erro e a ligação entre os três.
 *
 * Existe porque são doze campos com a mesma estrutura, e porque o que amarra
 * um erro ao seu input é `aria-describedby` — repetido doze vezes à mão, é
 * exatamente o tipo de coisa que falta em um deles, e o campo que ficar sem
 * passa a mostrar o erro só para quem enxerga.
 *
 * `children` é função para o controle receber os atributos calculados sem que
 * cada chamada precise repetir os ids.
 */
function Field({
  id,
  label,
  hint,
  error,
  required,
  optionalLabel,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Texto já traduzido do marcador de opcional; ausente marca nada. */
  optionalLabel?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : undefined, hint ? hintId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {/*
          O asterisco é decoração: quem usa leitor de tela recebe a mesma
          informação por `aria-required` no controle, e ouvir "asterisco" não
          diz que o campo é obrigatório.
        */}
        {required && <span aria-hidden="true"> *</span>}
        {optionalLabel && (
          // O espaço é literal de propósito: sem ele o nome acessível do campo
          // sai "Título (inglês)(opcional)", colado, porque JSX descarta a
          // quebra de linha entre o texto e o elemento.
          <>
            {' '}
            <span className="text-xs font-normal opacity-60">
              {optionalLabel}
            </span>
          </>
        )}
      </label>

      {children({
        id,
        name: id,
        'aria-required': required ? true : undefined,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}

      {hint && (
        <p id={hintId} className="text-xs opacity-60">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
