import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';

/** RF-PUB2, user story 4: an unknown slug gets a real page, not a blank one. */
export default function ProjectNotFound() {
  const t = useTranslations('projectDetail');

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('notFoundTitle')}
      </h1>
      <p className="opacity-70">{t('notFoundDescription')}</p>
      <Link
        href="/projetos"
        className="w-fit underline underline-offset-4 hover:opacity-70"
      >
        {t('backToProjects')}
      </Link>
    </div>
  );
}
