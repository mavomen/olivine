import { Command } from 'commander';
import { handleError } from '../utils/error';

function generateBashCompletion(): string {
  return [
    '_olivine_completions() {',
    '  local cur="${COMP_WORDS[COMP_CWORD]}"',
    '  local prev="${COMP_WORDS[COMP_CWORD-1]}"',
    '  local commands="init scan review stats tag due browse grep add edit"',
    '  commands="$commands config archive unarchive practice migrate export import tui completion upgrade"',
    '',
    '  if [[ $COMP_CWORD -eq 1 ]]; then',
    '    COMPREPLY=($(compgen -W "$commands" -- "$cur"))',
    '    return',
    '  fi',
    '',
    '  case "${COMP_WORDS[1]}" in',
    '    init|scan|review|stats|tag|due|browse|grep|add|edit|config|archive|unarchive|practice|migrate|export|import|tui)',
    '      COMPREPLY=($(compgen -W "--help --tui --tag --algo --sort --json --id --limit --shuffle --quality --all --output --set --title --content --tags" -- "$cur"))',
    '      ;;',
    '    completion)',
    '      COMPREPLY=($(compgen -W "bash zsh" -- "$cur"))',
    '      ;;',
    '  esac',
    '} &&',
    'complete -F _olivine_completions olivine',
    '',
  ].join('\n');
}

function generateZshCompletion(): string {
  return `#compdef olivine

_olivine_commands() {
  local commands
  commands=(
    "init:Initialize Olivine in a vault directory"
    "scan:Scan vault for markdown files"
    "review:Start a review session"
    "stats:Display learning statistics"
    "tag:List all tags with card counts"
    "due:Show number of due notes"
    "browse:Browse cards"
    "grep:Search cards by content"
    "add:Create a new card"
    "edit:Edit an existing card"
    "config:View or update configuration"
    "archive:Archive a card"
    "unarchive:Unarchive a card"
    "practice:Practice without saving results"
    "migrate:Migrate all cards to a new algorithm"
    "export:Export all data as JSON"
    "import:Import from JSON backup"
    "tui:Open the landing dashboard"
    "completion:Generate shell completion scripts"
    "upgrade:Check for newer version"
  )
  _describe 'command' commands
}

_olivine() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C \
    '1: :->command' \
    '*: :->args'

  case $state in
    command) _olivine_commands ;;
    args)
      case $line[1] in
        completion)
          _arguments '2:shell:(bash zsh)'
          ;;
        *)
          _arguments '*: :_files'
          ;;
      esac
      ;;
  esac
}

_olivine
`;
}

export function buildCompletionCommand(): Command {
  return new Command('completion')
    .description('Generate shell completion scripts')
    .argument('<shell>', 'Shell type: bash or zsh')
    .action((shell: string) => {
      try {
        if (shell === 'bash') {
          console.log(generateBashCompletion());
        } else if (shell === 'zsh') {
          console.log(generateZshCompletion());
        } else {
          throw new Error(`Unsupported shell: ${shell}. Supported: bash, zsh`);
        }
      } catch (err) {
        handleError('Completion failed', err);
      }
    });
}
