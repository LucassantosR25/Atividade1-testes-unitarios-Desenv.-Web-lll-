import type { Database } from "../../../src/database/connection";
import {
  PgStudentRepository,
  type Student,
} from "../../../src/modules/students/students.repository";

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();

describe("PgStudentRepository", () => {
  let query: jest.Mock;
  let repository: PgStudentRepository;

  beforeEach(() => {
    query = jest.fn();
    const db: Database = { query };
    repository = new PgStudentRepository(db);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    test("insere ra e name com $1, $2, retorna ra e name e devolve a linha criada", async () => {
      const row: Student = { ra: 123, name: "Ana" };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.create({ ra: 123, name: "Ana" });

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain(
        "INSERT INTO students (ra, name) VALUES ($1, $2)",
      );
      expect(normalized).toContain("RETURNING ra, name");
      expect(params).toEqual([123, "Ana"]);
    });

    test("propaga a mesma instância do erro lançado pelo banco", async () => {
      const failure = new Error("falha no banco em create");
      query.mockRejectedValue(failure);

      await expect(repository.create({ ra: 123, name: "Ana" })).rejects.toBe(
        failure,
      );
    });
  });

  describe("findAll", () => {
    test("seleciona ra e name ordenando por name, sem parâmetros, e retorna as linhas", async () => {
      const rows: Student[] = [
        { ra: 123, name: "Ana" },
        { ra: 456, name: "Bruno" },
      ];
      query.mockResolvedValue({ rows });

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(query).toHaveBeenCalledTimes(1);
      const call = query.mock.calls[0];
      const normalized = normalizeSql(call[0]);
      expect(normalized).toContain("SELECT ra, name FROM students");
      expect(normalized).toContain("ORDER BY name");
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
    test("filtra por ra = $1 com o RA no array de parâmetros e retorna a primeira linha", async () => {
      const row: Student = { ra: 123, name: "Ana" };
      query.mockResolvedValue({ rows: [row, { ra: 456, name: "Bruno" }] });

      const result = await repository.findOne(123);

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain("SELECT ra, name FROM students");
      expect(normalized).toContain("WHERE ra = $1");
      expect(params).toEqual([123]);
    });

    test("retorna undefined quando não há linhas", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findOne(123)).resolves.toBeUndefined();
    });

    test("propaga a mesma instância do erro lançado pelo banco", async () => {
      const failure = new Error("falha no banco em findOne");
      query.mockRejectedValue(failure);

      await expect(repository.findOne(123)).rejects.toBe(failure);
    });
  });
});
