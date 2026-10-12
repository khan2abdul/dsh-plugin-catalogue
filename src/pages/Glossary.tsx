import { Link } from '../lib/router';

interface Term {
  term: string;
  short: string;
  plain: string;
  detail?: string;
}

const GROUPS: { title: string; blurb: string; terms: Term[] }[] = [
  {
    title: 'The basics',
    blurb: 'Three words that explain what this whole catalogue is.',
    terms: [
      {
        term: 'Plugin',
        short: 'A piece of the assistant that can be turned on or off.',
        plain:
          'DeepSeek Harness is built out of small parts. Each part does one job — searching the web, reading files, remembering your goals. A "plugin" is one of those parts.',
        detail:
          'Technically each part is a module registered in the Cordis plugin tree, but you never have to touch that to use them.',
      },
      {
        term: 'Profile',
        short: 'One saved setup of the assistant.',
        plain:
          'Think of it as a saved configuration. The setup you are using is called "desktop". Different profiles can have different parts switched on.',
        detail: 'A profile lives in a folder under your DSH home directory and is composed from patch layers.',
      },
      {
        term: 'Session',
        short: 'One conversation with the assistant.',
        plain:
          'Each chat you start is a session. Sessions remember their own history, and some settings can differ between them.',
      },
      {
        term: 'Token',
        short: 'A small chunk of text the assistant counts.',
        plain:
          'The assistant measures how much it can read and write in chunks of text called tokens — roughly a short word each. A "text budget" on a plugin page means how much text fits before older parts have to be summarised.',
        detail:
          'You meet this word on the pages about long conversations and about measuring cost. Nothing about it needs your attention.',
      },
    ],
  },
  {
    title: 'How things get switched on',
    blurb: 'The words you will see on the technical pages.',
    terms: [
      {
        term: 'Row',
        short: 'One line in a setup file that turns a part on.',
        plain:
          'Every part of the assistant is switched on by a single line in a settings file. This catalogue calls that line a "row" and shows you the row for each plugin.',
        detail: 'A row has an id, the package it points at, and optional settings called config.',
      },
      {
        term: 'Config',
        short: 'The settings for one part.',
        plain:
          'Options you can change — how long to wait before giving up, which service to use, and so on. Changing config is the usual way to adjust behaviour without writing code.',
        detail: 'A row\'s config is replaced as a whole when a later layer overrides it; it is never merged.',
      },
      {
        term: 'Switched off',
        short: 'Installed, but not running.',
        plain:
          'Some parts come with the assistant but are turned off by default. Often that is because a different setup for each session should decide whether to use them.',
      },
      {
        term: 'Add-on (bundle)',
        short: 'A pack of new parts you can install.',
        plain:
          'A bundle is a small package that adds one or more new parts. Installing one is how you get extra abilities without editing files by hand.',
        detail: 'A bundle declares its own patch file, which lists the rows to insert.',
      },
      {
        term: 'Patch',
        short: 'A change made on top of the default setup.',
        plain:
          'Instead of editing the original settings, you write a small change that is applied afterwards. The assistant applies them in order, and the last change wins.',
        detail: 'Bundles ship patches; your own cordis.patch.yml is applied last, after them.',
      },
    ],
  },
  {
    title: 'Safety',
    blurb: 'The words that appear when you are asked to approve something.',
    terms: [
      {
        term: 'Permission mode',
        short: 'How much the assistant may do without asking.',
        plain:
          'There are three levels: read-only (look but never change), workspace-write (change things inside your project folder), and full access (change anything, no questions).',
      },
      {
        term: 'Sandbox',
        short: 'A fence around what a command can touch.',
        plain:
          'Before running a command, the assistant checks it against the fence. If the command reaches outside what is allowed, it is stopped rather than run.',
      },
      {
        term: 'Approval',
        short: 'The assistant asking you first.',
        plain:
          'When something is risky or outside the fence, the assistant asks you to allow it. If nothing can answer the question, the answer is "no" — it fails safe.',
      },
      {
        term: 'Job',
        short: 'A command still running in the background.',
        plain:
          'Long commands do not block the conversation. They run as jobs, and you can look at or stop them later.',
      },
    ],
  },
  {
    title: 'How sessions are shaped',
    blurb: 'Why two chats can behave differently.',
    terms: [
      {
        term: 'Session setup (preset)',
        short: 'The set of tools one chat gets.',
        plain:
          'Instead of giving every chat every tool, the assistant picks a setup. The standard one is meant for everyday coding work; others are stripped down or aimed at tool-builders.',
        detail: 'Shipped presets are standard, ptc, minimal and cordis.',
      },
      {
        term: 'Tool',
        short: 'Something the assistant can do for you.',
        plain:
          'Reading a file, searching the web, running a command, writing a to-do list. Tools come from the session setup, not from the profile — that is why two chats can differ.',
      },
      {
        term: 'Skill',
        short: 'Instructions the assistant loads when a task needs them.',
        plain:
          'A skill is a written procedure for a specific kind of job — making a Word document, for example. The assistant reads it only when the job comes up.',
      },
      {
        term: 'Subagent',
        short: 'A helper the assistant spawns to do part of the work.',
        plain:
          'For a big job, the assistant can hand a piece to a separate copy of itself and collect the result. Useful for long searches or work that can run in parallel.',
      },
      {
        term: 'Goal',
        short: 'An objective the assistant keeps working towards.',
        plain:
          'You can give the assistant a goal that survives across turns. It keeps going until the goal is done, and it will tell you if it is stuck.',
      },
      {
        term: 'Compaction',
        short: 'Making a long conversation shorter.',
        plain:
          'When a chat gets too long to send, older parts are summarised so the work can continue. Nothing is deleted from your saved history.',
      },
    ],
  },
  {
    title: 'Words only developers need',
    blurb: 'Listed so the technical pages are not mysterious.',
    terms: [
      {
        term: 'Cordis',
        short: 'The system that wires all the parts together.',
        plain:
          'It decides what loads, in what order, and lets one part use another without them knowing about each other.',
      },
      {
        term: 'Host plane',
        short: 'The parts shared by every session.',
        plain:
          'Some parts exist once for the whole program — storage, the web server, background jobs. Others are created per session. The "host plane" is the shared set.',
      },
      {
        term: '!!js',
        short: 'A little bit of live logic in a settings file.',
        plain:
          'It means "work this out when loading, not read it as text". Used for things like "only on Windows" or "the port chosen at launch".',
      },
      {
        term: 'app.asar',
        short: 'The archive the desktop app ships its code in.',
        plain:
          'It is a single file that contains the program. Ordinary tools cannot look inside it, which is why this catalogue was generated by reading it directly.',
      },
      {
        term: 'OpenTelemetry',
        short: 'The standard way programs report what they are doing.',
        plain:
          'Used here for optional usage reporting. Session content is only sent if you explicitly give feedback, and there is a setting to switch it off entirely.',
      },
    ],
  },
];

export function Glossary() {
  return (
    <div className="page">
      <section className="hero hero--compact">
        <div className="hero__eyebrow">Plain words</div>
        <h1 className="hero__title">Words explained</h1>
        <p className="hero__lead">
          Every technical word this catalogue uses, in one place. If a plugin page says something you
          do not recognise, it is probably here. You do not need any of it to use the assistant — it
          is only here so nothing on the site is a mystery.
        </p>
      </section>

      {GROUPS.map((g) => (
        <section className="panel" key={g.title}>
          <h2 className="panel__title">{g.title}</h2>
          <p className="panel__lead">{g.blurb}</p>
          <div className="terms">
            {g.terms.map((t) => (
              <div className="term" key={t.term}>
                <div className="term__term">{t.term}</div>
                <div className="term__short">{t.short}</div>
                <p className="term__plain">{t.plain}</p>
                {t.detail && <p className="term__detail">{t.detail}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="panel">
        <h2 className="panel__title">Still stuck?</h2>
        <p className="panel__lead">
          Try <Link to="/plugins">searching the catalogue</Link> for the word in plain English — the
          search looks through what each plugin does, not just its name. If you want the engineering
          version of any of this, it is in <Link to="/guides">Build your own</Link>.
        </p>
      </section>
    </div>
  );
}
