import { HttpError } from "../src/errors";
import {
  parseId,
  positiveInteger,
  validateBody,
  validateName,
} from "../src/validation";

// Executa a função e devolve o erro lançado (ou undefined, se nada foi lançado).
function catchError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

// Garante que a função rejeitou a entrada com HttpError 400.
function expectBadRequest(action: () => unknown) {
  const error = catchError(action);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(400);
}

const LIMITE_INT = 2147483647;

describe("positiveInteger", () => {
  test.each([
    ["limite inferior 1", 1],
    ["limite superior 2147483647", LIMITE_INT],
  ])("aceita %s e retorna o próprio número", (_cenario, value) => {
    expect(positiveInteger(value, "RA")).toBe(value);
  });

  test.each([
    ["zero", 0],
    ["negativo", -1],
    ["decimal", 1.5],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["acima do limite (2147483648)", LIMITE_INT + 1],
    ["string numérica", "123"],
    ["null", null],
    ["undefined", undefined],
  ])("rejeita %s com HttpError 400", (_cenario, value) => {
    expectBadRequest(() => positiveInteger(value, "RA"));
  });
});

describe("parseId", () => {
  test.each([
    ["limite inferior", "1", 1],
    ["limite superior", "2147483647", LIMITE_INT],
  ])("converte a string do %s para número", (_cenario, value, esperado) => {
    expect(parseId(value, "RA")).toBe(esperado);
  });

  test.each([
    ["conversão parcial (1abc)", "1abc"],
    ["decimal (1.2)", "1.2"],
    ["notação exponencial (1e2)", "1e2"],
    ["string vazia", ""],
    ["negativo (-1)", "-1"],
    ["zero", "0"],
    ["acima do limite (2147483648)", "2147483648"],
    ["número em vez de string (123)", 123],
  ])("rejeita %s com HttpError 400", (_cenario, value) => {
    expectBadRequest(() => parseId(value, "RA"));
  });
});

describe("validateName", () => {
  test.each([
    ["nome curto válido (Ana)", "Ana"],
    ["100 letras 'a' (limite máximo)", "a".repeat(100)],
  ])("aceita %s e retorna o nome recebido", (_cenario, value) => {
    expect(validateName(value)).toBe(value);
  });

  test.each([
    ["string vazia", ""],
    ["nome com 2 letras (ab)", "ab"],
    ["apenas espaços", "   "],
    ["1 letra cercada de espaços", " a "],
    ["101 letras 'a'", "a".repeat(101)],
    ["número", 123],
    ["null", null],
    ["undefined", undefined],
  ])("rejeita %s com HttpError 400", (_cenario, value) => {
    expectBadRequest(() => validateName(value));
  });
});

describe("validateBody", () => {
  test("retorna a mesma referência de um objeto congelado, sem modificá-lo", () => {
    const body = Object.freeze({ name: "Ana" });

    const result = validateBody(body);

    expect(result).toBe(body);
    expect(Object.isFrozen(body)).toBe(true);
    expect(body).toEqual({ name: "Ana" });
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
    ["array vazio", []],
    ["string", "Ana"],
    ["número", 12],
  ])("rejeita %s com HttpError 400", (_cenario, value) => {
    expectBadRequest(() => validateBody(value));
  });

  test("aceita campos extras e retorna a mesma referência sem alterar o objeto", () => {
    const body = { name: "Ana", extra: true };

    const result = validateBody(body);

    expect(result).toBe(body);
    expect(body).toEqual({ name: "Ana", extra: true });
  });
});
