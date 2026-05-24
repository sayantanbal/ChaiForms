import { z } from "zod";
import { baseField, conditionalRuleSchema } from "./base.ts";
import { shortTextFieldSchema } from "./short-text.ts";
import { longTextFieldSchema } from "./long-text.ts";
import { emailFieldSchema } from "./email.ts";
import { numberFieldSchema } from "./number.ts";
import { singleSelectFieldSchema } from "./single-select.ts";
import { multiSelectFieldSchema } from "./multi-select.ts";
import { checkboxFieldSchema } from "./checkbox.ts";
import { ratingFieldSchema } from "./rating.ts";
import { dateFieldSchema } from "./date.ts";

export { baseField, conditionalRuleSchema };
export { shortTextFieldSchema } from "./short-text.ts";
export { longTextFieldSchema } from "./long-text.ts";
export { emailFieldSchema } from "./email.ts";
export { numberFieldSchema } from "./number.ts";
export { singleSelectFieldSchema } from "./single-select.ts";
export { multiSelectFieldSchema } from "./multi-select.ts";
export { checkboxFieldSchema } from "./checkbox.ts";
export { ratingFieldSchema } from "./rating.ts";
export { dateFieldSchema } from "./date.ts";

export const FieldSchemaUnion = z.discriminatedUnion("type", [
  shortTextFieldSchema,
  longTextFieldSchema,
  emailFieldSchema,
  numberFieldSchema,
  singleSelectFieldSchema,
  multiSelectFieldSchema,
  checkboxFieldSchema,
  ratingFieldSchema,
  dateFieldSchema,
]);

export type FieldSchemaUnion = z.infer<typeof FieldSchemaUnion>;
export type FieldType = FieldSchemaUnion["type"];
