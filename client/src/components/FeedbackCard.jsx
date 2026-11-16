import React, { useState, useEffect } from 'react';
import { Star, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export const FeedbackCard = ({ tokenId, displayToken }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setRating(0);
    setComment('');
    setDone(false);
    setError('');
  }, [tokenId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.submitFeedback({ tokenId, rating, comment: comment.trim() });
      setDone(true);
    } catch (err) {
      if (err.status === 409) setDone(true);
      else setError(err.message || 'We could not save your rating. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div role="status" className="card p-5 flex items-center gap-3 text-left">
        <span className="icon-tile icon-tile-green w-10 h-10 rounded-xl">
          <CheckCircle2 size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="text-headline text-label">Thanks for your feedback</p>
          <p className="text-footnote text-secondary mt-0.5">Your rating for token {displayToken} helps the clinic improve.</p>
        </div>
      </div>
    );
  }

  const shown = hover || rating;

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6 text-left" aria-labelledby="feedback-title">
      <h2 id="feedback-title" className="text-headline text-label">Rate your visit</h2>
      <p className="text-footnote text-secondary mt-0.5">How was your experience today? It takes a few seconds.</p>

      <div className="flex items-center gap-1 mt-4" role="radiogroup" aria-label="Rating out of 5">
        {LABELS.map((label, i) => {
          const value = i + 1;
          const filled = value <= shown;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} ${value === 1 ? 'star' : 'stars'}, ${label}`}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-fill ${filled ? 'text-orange' : 'text-tertiary'}`}
            >
              <Star size={26} fill={filled ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          );
        })}
        <span className="text-subheadline text-secondary ml-2 min-w-[5rem]" aria-live="polite">
          {shown ? LABELS[shown - 1] : ''}
        </span>
      </div>

      <label htmlFor="feedback-comment" className="input-label mt-4">Comment (optional)</label>
      <textarea
        id="feedback-comment"
        value={comment}
        maxLength={500}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything the clinic should know?"
        rows={2}
        className="input-base min-h-[72px] py-2.5 resize-none"
      />

      {error && (
        <p role="alert" className="input-error-text flex items-center gap-1.5 mt-3">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={!rating || busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          {busy ? 'Sending' : 'Submit rating'}
        </button>
      </div>
    </form>
  );
};
