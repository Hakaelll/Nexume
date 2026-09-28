import { z } from "zod";
import { stateSchema, preferencesSchema } from "../../domain/model";

function freeze(value: unknown): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freeze(child);
  Object.freeze(value);
}

// Only outputs validated by this schema are reusable. Freeze them deeply so a
// caller cannot mutate an object behind the validation cache's back.
function immutable<T, I>(schema: z.ZodType<T, I>) {
  const validated = new WeakSet<object>();
  return z.transform<I, T>((input, ctx): T => {
    if (input && typeof input === "object" && validated.has(input))
      return input as T;
    const result = schema.safeParse(input);
    if (!result.success) {
      for (const issue of result.error.issues) ctx.addIssue({ ...issue });
      return z.NEVER;
    }
    freeze(result.data);
    if (result.data && typeof result.data === "object")
      validated.add(result.data);
    return result.data;
  });
}

const preferences = immutable(
  preferencesSchema.safeExtend({
    publications: immutable(preferencesSchema.shape.publications),
    columns: immutable(preferencesSchema.shape.columns),
  }),
);
const shape = stateSchema.shape;
const snapshot = immutable(
  stateSchema.safeExtend({
    entries: immutable(z.array(immutable(shape.entries.element)).max(10000)),
    lists: immutable(z.array(immutable(shape.lists.element)).max(2000)),
    history: immutable(z.array(immutable(shape.history.element)).max(200000)),
    queue: immutable(z.array(immutable(shape.queue.element)).max(5000)),
    profile: immutable(shape.profile),
    preferences,
    searchHistory: immutable(shape.searchHistory),
  }),
);

export const validateSnapshot = (value: unknown) => snapshot.parse(value);
export const validatePreferences = (value: unknown) => preferences.parse(value);
