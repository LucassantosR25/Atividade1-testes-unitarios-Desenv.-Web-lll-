import { isUniqueViolation } from "../../src/database/unique-violation";

describe("isUniqueViolation", () => {
  test("retorna true para um erro com code 23505", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
    ["a string '23505' sem objeto", "23505"],
    ["o número 23503", 23503],
    ["objeto vazio", {}],
    ["objeto com code 'outro'", { code: "outro" }],
  ])("retorna false para %s", (_cenario, value) => {
    expect(isUniqueViolation(value)).toBe(false);
  });
});
