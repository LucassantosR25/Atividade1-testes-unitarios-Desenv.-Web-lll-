import type { Database } from "../../../src/database/connection";
import {
  PgEnrollmentRepository,
  type Enrollment,
} from "../../../src/modules/enrollments/enrollments.repository";

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();

// Data fixa devolvida pelo banco simulado.
const ENROLLED_AT = new Date("2026-01-15T12:00:00.000Z");

// Aliases que mapeiam as colunas do banco para camelCase.
const ALIASES = [
  'student_ra AS "studentRa"',
  'course_id AS "courseId"',
  'enrolled_at AS "enrolledAt"',
];

function expectAliases(sql: string) {
  for (const alias of ALIASES) {
    expect(sql).toContain(alias);
  }
}

function buildEnrollment(studentRa = 123, courseId = 7): Enrollment {
  return { studentRa, courseId, enrolledAt: ENROLLED_AT };
}

describe("PgEnrollmentRepository", () => {
  let query: jest.Mock;
  let repository: PgEnrollmentRepository;

  beforeEach(() => {
    query = jest.fn();
    const db: Database = { query };
    repository = new PgEnrollmentRepository(db);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    test("insere student_ra e course_id com $1, $2, usa os aliases em RETURNING e devolve a linha em camelCase", async () => {
      const row = buildEnrollment(123, 7);
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.create(123, 7);

      expect(result).toEqual(row);
      expect(result.enrolledAt).toBe(ENROLLED_AT);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain(
        "INSERT INTO enrollments (student_ra, course_id) VALUES ($1, $2)",
      );
      expect(normalized).toContain("RETURNING");
      expectAliases(normalized.slice(normalized.indexOf("RETURNING")));
      expect(params).toEqual([123, 7]);
    });

    test("propaga a mesma instância do erro lançado pelo banco", async () => {
      const failure = new Error("falha no banco em create");
      query.mockRejectedValue(failure);

      await expect(repository.create(123, 7)).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("seleciona com aliases ordenando por student_ra, course_id, sem parâmetros, e retorna as linhas", async () => {
      const rows = [buildEnrollment(123, 1), buildEnrollment(123, 7)];
      query.mockResolvedValue({ rows });

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(query).toHaveBeenCalledTimes(1);
      const call = query.mock.calls[0];
      const normalized = normalizeSql(call[0]);
      expect(normalized).toContain("SELECT");
      expect(normalized).toContain("FROM enrollments");
      expectAliases(normalized);
      expect(normalized).toContain("ORDER BY student_ra, course_id");
      expect(call).toHaveLength(1); // nenhum array de parâmetros
    });

    test("retorna lista vazia quando não há linhas", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findAll()).resolves.toEqual([]);
    });

    test("propaga a mesma instância do erro lançado pelo banco", async () => {
      const failure = new Error("falha no banco em findAll");
      query.mockRejectedValue(failure);

      await expect(repository.findAll()).rejects.toBe(failure);
    });
  });

  describe("findOne", () => {
    test("filtra por student_ra = $1 AND course_id = $2 com os identificadores nos parâmetros e retorna a primeira linha", async () => {
      const row = buildEnrollment(123, 7);
      query.mockResolvedValue({ rows: [row, buildEnrollment(456, 8)] });

      const result = await repository.findOne(123, 7);

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain("FROM enrollments");
      expectAliases(normalized);
      expect(normalized).toContain("WHERE student_ra = $1 AND course_id = $2");
      expect(params).toEqual([123, 7]);
    });

    test("retorna undefined quando não há linhas", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findOne(123, 7)).resolves.toBeUndefined();
    });

    test("propaga a mesma instância do erro lançado pelo banco", async () => {
      const failure = new Error("falha no banco em findOne");
      query.mockRejectedValue(failure);

      await expect(repository.findOne(123, 7)).rejects.toBe(failure);
    });
  });
});
