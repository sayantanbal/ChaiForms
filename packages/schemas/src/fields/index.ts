import { z } from "zod";
import { baseField, conditionalRuleSchema } from "./base.js";
import { shortTextFieldSchema } from "./short-text.js";
import { longTextFieldSchema } from "./long-text.js";
import { emailFieldSchema } from "./email.js";
import { numberFieldSchema } from "./number.js";
import { singleSelectFieldSchema } from "./single-select.js";
import { multiSelectFieldSchema } from "./multi-select.js";
import { checkboxFieldSchema } from "./checkbox.js";
import { ratingFieldSchema } from "./rating.js";
import { dateFieldSchema } from "./date.js";

export { baseField, conditionalRuleSchema };
export { shortTextFieldSchema } from "./short-text.js";
export { longTextFieldSchema } from "./long-text.js";
export { emailFieldSchema } from "./email.js";
export { numberFieldSchema } from "./number.js";
export { singleSelectFieldSchema } from "./single-select.js";
export { multiSelectFieldSchema } from "./multi-select.js";
export { checkboxFieldSchema } from "./checkbox.js";
export { ratingFieldSchema } from "./rating.js";
export { dateFieldSchema } from "./date.js";

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
