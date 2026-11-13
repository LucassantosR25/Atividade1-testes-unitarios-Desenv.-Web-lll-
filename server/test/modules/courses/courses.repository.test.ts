import type { Database } from "../../../src/database/connection";
import {
  PgCourseRepository,
  type Course,
} from "../../../src/modules/courses/courses.repository";

// Remove diferenças de espaços e quebras de linha antes de comparar o SQL.
const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();

describe("PgCourseRepository", () => {
  // Database simulado: apenas query() é necessário.
  let query: jest.Mock;
  let repository: PgCourseRepository;

  beforeEach(() => {
    query = jest.fn();
    const db: Database = { query };
    repository = new PgCourseRepository(db);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    test("insere o nome com $1, retorna id e name e devolve a linha criada", async () => {
      const row: Course = { id: 7, name: "Qualidade" };
      query.mockResolvedValue({ rows: [row] });

      const result = await repository.create({ name: "Qualidade" });

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain("INSERT INTO courses (name) VALUES ($1)");
      expect(normalized).toContain("RETURNING id, name");
      expect(params).toEqual(["Qualidade"]);
    });

    test("propaga a mesma instância do erro lançado pelo banco", async () => {
      const failure = new Error("falha no banco em create");
      query.mockRejectedValue(failure);

      await expect(repository.create({ name: "Qualidade" })).rejects.toBe(
        failure,
      );
    });
  });

  describe("findAll", () => {
    test("seleciona id e name ordenando por id, sem parâmetros, e retorna as linhas", async () => {
      const rows: Course[] = [
        { id: 1, name: "Qualidade" },
        { id: 2, name: "Testes" },
      ];
      query.mockResolvedValue({ rows });

      const result = await repository.findAll();

      expect(result).toEqual(rows);
      expect(query).toHaveBeenCalledTimes(1);
      const call = query.mock.calls[0];
      const normalized = normalizeSql(call[0]);
      expect(normalized).toContain("SELECT id, name FROM courses");
      expect(normalized).toContain("ORDER BY id");
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
    test("filtra por id = $1 com o identificador no array de parâmetros e retorna a primeira linha", async () => {
      const row: Course = { id: 7, name: "Qualidade" };
      query.mockResolvedValue({ rows: [row, { id: 8, name: "Outra" }] });

      const result = await repository.findOne(7);

      expect(result).toEqual(row);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      const normalized = normalizeSql(sql);
      expect(normalized).toContain("SELECT id, name FROM courses");
      expect(normalized).toContain("WHERE id = $1");
      expect(params).toEqual([7]);
    });

    test("retorna undefined quando não há linhas", async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.findOne(7)).resolves.toBeUndefined();
    });

    test("propaga a mesma instância do erro lançado pelo banco", async () => {
      const failure = new Error("falha no banco em findOne");
      query.mockRejectedValue(failure);

      await expect(repository.findOne(7)).rejects.toBe(failure);
    });
  });
});
