import {
  createProjectSchema,
  isCompletionConsistent,
  updateProjectSchema,
  type CreateProjectInput,
  type LocalizedText,
  type ProjectStatus,
  type UpdateProjectInput,
} from '@portfolio/shared';
import type { AdminProject } from './admin-projects';

/**
 * A lógica do formulário de projeto, sem React.
 *
 * Separada do componente pelo mesmo motivo que AdminProjectsTable é separada
 * da página: o que dá para testar como função pura fica sendo função pura. O
 * componente cuida de input e foco; montar o payload e decidir o que está
 * inválido é aqui.
 *
 * A validação usa os schemas de packages/shared — os mesmos que a API usa
 * (apps/api/src/projects/dto/project.dto.ts). É o que sustenta a user story
 * 5: um payload que passa aqui não pode ser recusado lá por uma regra que a
 * pessoa não foi avisada antes.
 */

/** Campos bilíngues. `en` é opcional em todo o domínio (RF-PROJ1). */
export const LOCALIZED_FIELDS = ['title', 'description', 'content'] as const;
export type LocalizedField = (typeof LOCALIZED_FIELDS)[number];

/** Os três campos de URL, todos opcionais e todos anuláveis no banco. */
export const URL_FIELDS = ['repoUrl', 'demoUrl', 'coverImageUrl'] as const;
export type UrlField = (typeof URL_FIELDS)[number];

export interface LocalizedInput {
  pt: string;
  en: string;
}

/**
 * O estado do formulário. Tudo string porque é o que um `<input>` devolve —
 * a conversão para o formato do domínio (omitir vazio, `null` para limpar)
 * acontece em `toPayload`, num lugar só e testável.
 */
export interface ProjectFormValues {
  title: LocalizedInput;
  description: LocalizedInput;
  content: LocalizedInput;
  slug: string;
  techStack: string[];
  repoUrl: string;
  demoUrl: string;
  coverImageUrl: string;
  status: ProjectStatus;
  featured: boolean;
  /** `YYYY-MM-DD`, o formato de `<input type="date">` e da coluna `date`. */
  completedAt: string;
}

export type ProjectFormMode = 'create' | 'edit';

/**
 * Chave de mensagem por campo, indexada pelo caminho do Zod
 * (`title.pt`, `slug`, `repoUrl`).
 */
export type ProjectFormErrors = Record<string, string>;

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  title: { pt: '', en: '' },
  description: { pt: '', en: '' },
  content: { pt: '', en: '' },
  slug: '',
  techStack: [],
  repoUrl: '',
  demoUrl: '',
  coverImageUrl: '',
  // Os mesmos defaults que `createProjectSchema` aplica, para o formulário
  // abrir mostrando o que a API assumiria em silêncio.
  status: 'in_progress',
  featured: false,
  completedAt: '',
};

/**
 * RF-PROJ2: o formulário de edição abre com o que já existe, em vez de
 * exigir redigitar.
 *
 * Ausente vira `''` e não `undefined` porque um `<input>` controlado com
 * `value={undefined}` passa a não-controlado, e o React avisa no console —
 * além de o campo parar de responder ao estado.
 */
export function toFormValues(project: AdminProject): ProjectFormValues {
  return {
    title: toLocalizedInput(project.title),
    description: toLocalizedInput(project.description),
    content: toLocalizedInput(project.content),
    slug: project.slug,
    techStack: [...(project.techStack ?? [])],
    repoUrl: project.repoUrl ?? '',
    demoUrl: project.demoUrl ?? '',
    coverImageUrl: project.coverImageUrl ?? '',
    status: project.status,
    featured: project.featured,
    completedAt: project.completedAt ?? '',
  };
}

/**
 * User story 4: quais campos ainda não têm tradução, para o indicador dizer
 * *o que* falta em vez de só que falta alguma coisa.
 */
export function missingTranslations(
  values: ProjectFormValues,
): LocalizedField[] {
  return LOCALIZED_FIELDS.filter((field) => values[field].en.trim() === '');
}

/**
 * Converte o estado do formulário no corpo que vai para a API.
 *
 * As duas decisões que importam:
 *
 * - Vazio em `en` **omite a chave**. O schema recusa `''` de propósito
 *   (packages/shared): omitir significa "ainda não traduzido", e guardar
 *   string vazia deixaria o fallback do site público ambíguo.
 * - Vazio num campo opcional vira `null` na edição e chave omitida na
 *   criação. Num PATCH, chave ausente significa "não mexe" — mandar a chave
 *   ausente para limpar um link deixaria o valor antigo lá, e a tela
 *   mostraria uma remoção que não aconteceu. Na criação não há o que
 *   preservar, então omitir já quer dizer "sem valor".
 *
 * Os campos bilíngues vão sempre inteiros, mesmo com `pt` vazio: é o que faz
 * o erro cair em `title.pt` em vez de num `title` genérico, e é o que a
 * coluna jsonb exige (substituição, não merge).
 */
export function toPayload(
  values: ProjectFormValues,
  mode: ProjectFormMode,
): Record<string, unknown> {
  const cleared = mode === 'edit' ? null : undefined;

  const payload: Record<string, unknown> = {
    title: toLocalizedText(values.title),
    description: toLocalizedText(values.description),
    content: toLocalizedText(values.content),
    slug: values.slug.trim(),
    techStack: values.techStack.map((tech) => tech.trim()).filter(Boolean),
    status: values.status,
    featured: values.featured,
    completedAt: values.completedAt.trim() || cleared,
  };

  for (const field of URL_FIELDS) {
    payload[field] = values[field].trim() || cleared;
  }

  return payload;
}

export type ProjectFormValidation =
  | { ok: true; mode: 'create'; payload: CreateProjectInput }
  | { ok: true; mode: 'edit'; payload: UpdateProjectInput }
  | { ok: false; errors: ProjectFormErrors };

/**
 * Valida contra o schema compartilhado com a API e devolve, quando falha, um
 * erro por campo — não um blob no topo do formulário (user story 3).
 */
export function validateProjectForm(
  values: ProjectFormValues,
  mode: ProjectFormMode,
): ProjectFormValidation {
  const payload = toPayload(values, mode);

  if (mode === 'create') {
    const parsed = createProjectSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, errors: toFieldErrors(parsed.error.issues) };
    }
    return completionError(values) ?? { ok: true, mode, payload: parsed.data };
  }

  const parsed = updateProjectSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error.issues) };
  }
  return completionError(values) ?? { ok: true, mode, payload: parsed.data };
}

/**
 * A regra que nenhum schema expressa sozinho, porque num PATCH ela vale sobre
 * o estado *combinado*. Aqui o formulário sempre manda `status` e
 * `completedAt` juntos, então o estado combinado é o que está na tela — e
 * conferir antes de enviar troca um 400 do servidor por um erro no campo.
 */
function completionError(
  values: ProjectFormValues,
): { ok: false; errors: ProjectFormErrors } | undefined {
  if (isCompletionConsistent(values.status, values.completedAt.trim())) {
    return undefined;
  }
  return { ok: false, errors: { completedAt: 'completedAtNeedsCompleted' } };
}

function toFieldErrors(
  issues: readonly { path: PropertyKey[]; code: string }[],
): ProjectFormErrors {
  const errors: ProjectFormErrors = {};

  for (const issue of issues) {
    const path = fieldPathOf(issue.path);
    // Primeira issue por campo. As seguintes costumam ser refinamentos da
    // mesma causa, e empilhá-las daria três mensagens embaixo de um input.
    if (errors[path] === undefined) {
      errors[path] = errorKeyFor(path, issue.code);
    }
  }

  return errors;
}

/**
 * O caminho do Zod reduzido ao campo que o formulário de fato renderiza.
 *
 * Só `techStack` muda de forma: um item inválido chega como `techStack.0`, e
 * não existe input com esse nome — o erro ficaria guardado sem nunca aparecer
 * na tela. O índice é descartado porque a lista é uma etiqueta por item e a
 * mensagem pertence ao conjunto.
 */
function fieldPathOf(path: readonly PropertyKey[]): string {
  const [first] = path;
  return first === 'techStack' ? 'techStack' : path.join('.');
}

/**
 * Traduz uma falha do Zod na chave de mensagem que o formulário renderiza.
 *
 * O texto não vem do schema porque o schema é compartilhado com a API e
 * responde em uma língua só, enquanto a UI passa por next-intl — e porque a
 * maioria das mensagens padrão do Zod é inglês genérico ("Invalid input"),
 * que embaixo de um campo não diz o que corrigir.
 *
 * `invalid` no fim é rede de segurança: uma regra nova no schema aparece como
 * mensagem genérica em vez de campo sem erro nenhum.
 */
function errorKeyFor(path: string, code: string): string {
  if (path.endsWith('.pt')) {
    return 'requiredPt';
  }

  if (path === 'slug') {
    if (code === 'invalid_format') return 'invalidSlug';
    if (code === 'too_big') return 'slugTooLong';
    return 'requiredSlug';
  }

  if ((URL_FIELDS as readonly string[]).includes(path)) {
    return code === 'too_big' ? 'urlTooLong' : 'invalidUrl';
  }

  if (path === 'completedAt') {
    return 'invalidDate';
  }

  if (path === 'techStack') {
    return 'invalidTech';
  }

  return 'invalid';
}

function toLocalizedInput(text: LocalizedText | undefined): LocalizedInput {
  return { pt: text?.pt ?? '', en: text?.en ?? '' };
}

function toLocalizedText(input: LocalizedInput): LocalizedText {
  const en = input.en.trim();
  return en === '' ? { pt: input.pt.trim() } : { pt: input.pt.trim(), en };
}
