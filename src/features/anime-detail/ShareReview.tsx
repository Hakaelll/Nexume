import { t, useLanguage } from "../../core/i18n";
import { useShallow } from "zustand/react/shallow";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { type Entry, id } from "../../domain/model";
import { useApp } from "../../app/store";
import { Modal } from "../../components/ui";
import { social, publicLink } from "../../services/social/provider";
import { serializeReview } from "../../services/social/serialization";
import { enqueue, flushQueue } from "../../services/social/sync";
export function ShareReview({ entry }: { entry: Entry }) {
  useLanguage();
  const store = useApp(
    useShallow((state) => ({
      data: state.data,
      prefs: state.prefs,
      mutate: state.mutate,
      add: state.add,
      addMany: state.addMany,
      edit: state.edit,
      remove: state.remove,
      episodes: state.episodes,
      adjustEpisodes: state.adjustEpisodes,
      complete: state.complete,
      rewatch: state.rewatch,
      notify: state.notify,
    })),
  );
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const publish = async () => {
    try {
      const existing = store.data.preferences.publications.find(
        (p) => p.kind === "review" && p.sourceId === entry.localId,
      );
      const publicId = existing?.publicId ?? id();
      await enqueue(
        publicId,
        "review",
        entry.reviewPrivacy,
        entry.reviewPrivacy === "Private"
          ? {}
          : serializeReview(entry, store.data),
        entry.localId,
      );
      await flushQueue(true);
      if (entry.reviewPrivacy !== "Private") setLink(publicLink(publicId));
      store.notify(
        useApp.getState().data.queue.some((q) => q.publicId === publicId)
          ? "Pending sync."
          : "Review publication updated.",
      );
    } catch (e) {
      store.notify(String(e));
    }
  };
  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)}>
        <Share2 size={13} /> {t("Share review")}{" "}
      </button>
      {open && (
        <Modal title={t("Share your words")} onClose={() => setOpen(false)}>
          <p className="prose">
            {" "}
            {t(
              "Publish this review, your rating and quick thought. Spoilers stay hidden until the reader reveals them. Private notes are never included.",
            )}{" "}
          </p>
          <p className="muted">
            {" "}
            {t("Visibility:")} {entry.reviewPrivacy}
            {t(". Change it in the review editor.")}{" "}
          </p>
          {social.configured ? (
            <button className="button primary" onClick={() => void publish()}>
              {entry.reviewPrivacy === "Private"
                ? t("Remove online review")
                : t("Publish review")}
            </button>
          ) : (
            <p className="configuration-note">
              {" "}
              {t("Online sharing: Not configured.")}{" "}
            </p>
          )}
          {link && (
            <div className="share-link">
              <input
                readOnly
                value={link}
                aria-label={t("Review share link")}
              />
              <button
                className="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(link)
                    .then(() => store.notify("Link copied."))
                }
              >
                {" "}
                {t("Copy link")}{" "}
              </button>
              <a
                className="button"
                href={link}
                target="_blank"
                rel="noreferrer"
              >
                {" "}
                {t("Open public review")}{" "}
              </a>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
