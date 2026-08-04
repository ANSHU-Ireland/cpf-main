// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Field } from './Field.js';
import { Input } from './Input.js';

afterEach(cleanup);

describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field label="Email">
        {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} />}
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('links a hint via aria-describedby', () => {
    render(
      <Field label="Email" hint="Use your work address">
        {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAccessibleDescription('Use your work address');
  });

  it('exposes an error as an alert and marks the control invalid', () => {
    render(
      <Field label="Email" error="Email is required">
        {({ id, invalid, describedBy }) => (
          <Input id={id} invalid={invalid} aria-describedby={describedBy} />
        )}
      </Field>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders no alert when there is no error', () => {
    render(<Field label="Email">{({ id }) => <Input id={id} />}</Field>);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
