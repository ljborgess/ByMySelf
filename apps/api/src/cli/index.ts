import { runCreateAdmin } from './create-admin';

const [command, ...rest] = process.argv.slice(2);

async function main(): Promise<void> {
  switch (command) {
    case 'create-admin':
      await runCreateAdmin(rest);
      return;
    default:
      console.error(
        `Unknown command: ${command ?? '(none)'}\nUsage: pnpm cli create-admin [--email=you@example.com]`,
      );
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error('CLI command failed:', error);
  process.exit(1);
});
