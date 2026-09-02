import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  type CatalogueProfile,
} from '@profils-actifs/shared';
import { toApiError } from '../services/api.js';
import { sendContact } from '../services/recruiter.js';

interface ContactDialogProps {
  profile: CatalogueProfile;
  onClose: () => void;
  onSent: (profile: CatalogueProfile) => void;
}

export const ContactDialog = ({ profile, onClose, onSent }: ContactDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // <dialog> is a browser widget: it only becomes modal — with focus trapping,
  // Escape handling and an inert background — when opened imperatively.
  // Removing the element from the DOM closes it, so there is no cleanup to
  // run: calling close() here would fire the `close` event and unmount the
  // dialog the moment React re-invokes the effect in development.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const fullName = `${profile.firstName} ${profile.lastName}`;

  // The button stays enabled and says why on submit: a control that is greyed
  // out without explanation leaves the reader guessing what is missing.
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (isSending) return;

    const trimmed = message.trim();

    if (trimmed.length < CONTACT_MESSAGE_MIN_LENGTH) {
      setError(
        `Écrivez au moins ${CONTACT_MESSAGE_MIN_LENGTH} caractères pour présenter votre proposition.`,
      );
      messageRef.current?.focus();
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await sendContact(profile.userId, trimmed);
      onSent(profile);
    } catch (cause: unknown) {
      setError(toApiError(cause).message);
      messageRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <dialog ref={dialogRef} onClose={onClose} aria-labelledby="contact-dialog-title">
      {/* noValidate: the browser's own bubble would pre-empt the submit handler
          and never mention the minimum length the API enforces. */}
      <form className="dialog__body" onSubmit={submit} noValidate>
        <h2 id="contact-dialog-title">Contacter {fullName}</h2>
        <p className="panel__subtitle">
          {fullName} recevra une notification avec votre message. Présentez le poste et la suite que
          vous proposez.
        </p>

        {error && (
          <p className="alert alert--error" id="contact-error" role="alert">
            {error}
          </p>
        )}

        <div className="field">
          <label className="field__label" htmlFor="contact-message">
            Message
          </label>
          <textarea
            id="contact-message"
            ref={messageRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={CONTACT_MESSAGE_MAX_LENGTH}
            aria-describedby={error ? 'contact-error' : undefined}
            aria-invalid={error !== null}
            required
            autoFocus
          />
          <span className="dialog__counter">
            {message.length} / {CONTACT_MESSAGE_MAX_LENGTH}
          </span>
        </div>

        <div className="dialog__footer">
          <button type="button" className="button" onClick={onClose} disabled={isSending}>
            Annuler
          </button>
          <button type="submit" className="button button--primary" disabled={isSending}>
            {isSending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </form>
    </dialog>
  );
};
