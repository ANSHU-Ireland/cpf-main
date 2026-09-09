import Link from 'next/link';

const JOURNEY = [
  {
    role: 'Employer',
    title: 'Set up the hiring campaign',
    task: 'Open Campaigns to see the role being hired for. Candidates and Invitations show who is taking part.',
    result: 'A campaign connects the job, assessment and applicants.',
  },
  {
    role: 'Candidate',
    title: 'Complete an assessment',
    task: 'Open Applications, choose an available application and follow its readiness checks before starting an attempt.',
    result: 'The submitted work becomes evidence for a human reviewer.',
  },
  {
    role: 'Reviewer',
    title: 'Review the submitted evidence',
    task: 'Open an assigned review, inspect the evidence, complete the scorecard and submit the review.',
    result:
      'A human assessment supports the employer’s decision. AI does not make the hiring decision.',
  },
  {
    role: 'Employer',
    title: 'Draft a decision',
    task: 'Open a candidate’s application and its Decision page. Select an outcome, explain the rationale and save a draft.',
    result: 'The saved draft is ready for an independent approval.',
  },
  {
    role: 'Approver',
    title: 'Approve or return the draft',
    task: 'Switch to the Approver account and open the same application’s Approval page. Check the rationale before approving or returning it.',
    result: 'Approval is a separate step and must not be performed by the drafter.',
  },
  {
    role: 'Employer',
    title: 'Issue the approved decision',
    task: 'Switch back to Employer and issue the approved decision. Reload the record to check its saved status.',
    result:
      'The decision is issued and a notice is queued. Queued does not mean an external email was delivered.',
  },
] as const;

export default function LandingPage(): React.JSX.Element {
  return (
    <main id="main" className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 mt-0 text-sm font-semibold text-blue">CPF · Product walkthrough</p>
          <h1 className="m-0 text-3xl font-semibold text-ink">Start here</h1>
        </div>
        <Link
          href="/sign-in"
          className="rounded-control border border-line bg-paper px-5 py-3 font-semibold text-blue"
        >
          Choose a workspace
        </Link>
      </header>

      <section
        aria-labelledby="scenario-title"
        className="rounded-surface border border-line bg-paper p-6 sm:p-8"
      >
        <p className="m-0 text-sm font-semibold text-blue">
          Your first scenario · Northstar Logistics
        </p>
        <h2 id="scenario-title" className="mb-3 mt-2 text-2xl font-semibold text-ink">
          Follow one hiring decision from assessment to approval
        </h2>
        <p className="max-w-3xl text-muted">
          CPF brings candidate work, human review and controlled decisions together. Start as the
          Employer, then switch roles to see each person’s part in the process. All people and
          records in this demo are synthetic.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link
            href="/sign-in?role=Employer"
            className="inline-flex min-h-target items-center rounded-control bg-blue px-5 py-3 font-semibold text-paper"
          >
            Start as Employer
          </Link>
          <a href="#decision-example" className="text-sm font-semibold text-blue">
            Inspect the tested decision example
          </a>
        </div>
      </section>

      <aside
        aria-label="Demo readiness"
        className="my-6 rounded-control border border-line bg-amber-soft p-5 text-ink"
      >
        <strong>Working preview — not a release-ready product yet.</strong>
        <p className="mb-0 mt-2 text-sm">
          The draft → independent approval → issuance journey has been checked in the browser
          against saved records. The complete campaign-to-assessment journey has not yet passed
          end-to-end acceptance testing. Some administration, governance, operations and support
          actions are unfinished.
        </p>
      </aside>

      <section aria-labelledby="workflow-title" className="my-10">
        <h2 id="workflow-title" className="mb-2 text-2xl font-semibold text-ink">
          Who does what?
        </h2>
        <p className="mb-6 mt-0 text-muted">
          This is the intended business workflow, not a checklist of completed tests. Existing
          sample records are at different stages; an issued decision cannot be drafted again.
        </p>
        <ol className="grid list-none gap-4 p-0 md:grid-cols-2">
          {JOURNEY.map((step, index) => (
            <li key={step.title} className="rounded-surface border border-line bg-paper p-5">
              <div className="mb-3 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-soft font-semibold text-blue"
                >
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-muted">{step.role}</span>
              </div>
              <h3 className="m-0 text-lg font-semibold text-ink">{step.title}</h3>
              <p className="text-sm leading-6 text-muted">{step.task}</p>
              <p className="text-sm leading-6 text-ink">{step.result}</p>
              <Link
                href={`/sign-in?role=${step.role}`}
                className="inline-flex min-h-target items-center text-sm font-semibold text-blue"
              >
                Choose {step.role}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="decision-example"
        aria-labelledby="example-title"
        className="my-8 rounded-surface border border-line bg-paper p-6"
      >
        <p className="m-0 text-sm font-semibold text-blue">
          Browser-checked example · 6 September 2026
        </p>
        <h2 id="example-title" className="mb-3 mt-2 text-xl font-semibold text-ink">
          An issued hold decision
        </h2>
        <p className="text-muted">
          Campaign: Operations Lead — August 2026. Candidate reference: DEMO-CANDIDATE-05. An
          Employer drafted a hold, a separate Approver approved it, and the Employer issued it.
          Reloading preserved the issued status and approver.
        </p>
        <p className="text-sm text-muted">
          Sign in as Employer first, then return to this guide and open the record. This is an
          already-completed example, not a fresh practice task. It is available in the local
          Northstar seed; another environment or tenant may not contain it.
        </p>
        <Link
          href="/employer/applications/11111111-0000-4000-8000-000000000217/decision"
          className="inline-flex min-h-target items-center font-semibold text-blue"
        >
          Open example decision
        </Link>
      </section>

      <section aria-labelledby="oversight-title" className="my-10">
        <h2 id="oversight-title" className="text-xl font-semibold text-ink">
          Oversight sits alongside the hiring workflow
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-surface border border-line bg-paper p-5">
            <h3 className="m-0 text-lg font-semibold text-ink">Governance</h3>
            <p className="text-sm leading-6 text-muted">
              Open QMS procedures to inspect controlled document records or save a draft with a
              document reference and checksum. Uploading and approving the actual document are not
              part of this completed slice.
            </p>
            <Link
              href="/sign-in?role=Governance"
              className="inline-flex min-h-target items-center font-semibold text-blue"
            >
              Choose Governance
            </Link>
          </article>
          <article className="rounded-surface border border-line bg-paper p-5">
            <h3 className="m-0 text-lg font-semibold text-ink">Audit</h3>
            <p className="text-sm leading-6 text-muted">
              Open Evidence collections to inspect example collections and their custody history.
              Synthetic evidence is for evaluation, not proof of compliance or release approval.
            </p>
            <Link
              href="/sign-in?role=Auditor"
              className="inline-flex min-h-target items-center font-semibold text-blue"
            >
              Choose Auditor
            </Link>
          </article>
        </div>
      </section>

      <section
        aria-labelledby="help-title"
        className="rounded-surface border border-line bg-soft p-6"
      >
        <h2 id="help-title" className="m-0 text-xl font-semibold text-ink">
          If you land in account settings
        </h2>
        <p className="text-sm leading-6 text-muted">
          Profile, Preferences and Security manage your account; they are not the hiring workflow.
          Use “Demo guide” to come back here or “Switch workspace” to choose a role. If sign-in
          requires a password change or MFA, complete that security step first. If you changed a
          demo account’s password, use its email and your new password instead of the one-click role
          button.
        </p>
        <p className="mb-0 text-sm text-muted">
          Switching roles signs in as a different demo person. It does not reset records. Use
          synthetic information only.
        </p>
      </section>
    </main>
  );
}
