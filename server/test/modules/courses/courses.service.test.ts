import { HttpError } from "../../../src/errors";
import type {
  Course,
  CourseRepository,
} from "../../../src/modules/courses/courses.repository";
import { CoursesService } from "../../../src/modules/courses/courses.service";

// Dublê do repositório: cada método é uma função simulada (jest.fn).
function createRepositoryMock(): jest.Mocked<CourseRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
}

// Confirma que a Promise foi rejeitada com HttpError e o statusCode esperado.
async function expectHttpError(promise: Promise<unknown>, statusCode: number) {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(statusCode);
}

describe("CoursesService", () => {
  let repository: jest.Mocked<CourseRepository>;
  let service: CoursesService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new CoursesService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    test("com nome válido retorna o registro criado e repassa os dados ao repositório uma única vez", async () => {
      const created: Course = { id: 1, name: "Qualidade" };
      repository.create.mockResolvedValue(created);

      const result = await service.create({ name: "Qualidade" });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
    });

    test.each([
      ["corpo null", null],
      ["objeto sem nome", {}],
      ["nome curto demais (A)", { name: "A" }],
    ])(
      "com %s lança erro 400 e não chama repository.create",
      async (_cenario, input) => {
        await expectHttpError(service.create(input), 400);

        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    test("com nome duplicado (código 23505) lança erro 409", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(service.create({ name: "Qualidade" }), 409);
    });

    test("ignora campos extras e envia ao repositório somente o nome", async () => {
      repository.create.mockResolvedValue({ id: 1, name: "Qualidade" });

      await service.create({ name: "Qualidade", extra: true });

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
    });

    test("propaga a mesma instância de uma falha inesperada do repositório", async () => {
      const failure = new Error("falha inesperada em create");
      repository.create.mockRejectedValue(failure);

      await expect(service.create({ name: "Qualidade" })).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna a lista definida no stub e consulta o repositório uma única vez", async () => {
      // Stub: resposta predefinida, sem interesse no comportamento interno.
      const courses: Course[] = [
        { id: 1, name: "Qualidade" },
        { id: 2, name: "Testes" },
      ];
      repository.findAll.mockResolvedValue(courses);

      const result = await service.findAll();

      expect(result).toEqual(courses);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    test("propaga a mesma instância de uma falha inesperada do repositório", async () => {
      const failure = new Error("falha inesperada em findAll");
      repository.findAll.mockRejectedValue(failure);

      await expect(service.findAll()).rejects.toBe(failure);
    });
  });

  describe("findOne", () => {
    test("retorna o registro existente e encaminha o identificador ao repositório", async () => {
      const course: Course = { id: 123, name: "Qualidade" };
      repository.findOne.mockResolvedValue(course);

      const result = await service.findOne(123);

      expect(result).toEqual(course);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });

    test("lança erro 404 quando o repositório devolve undefined", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123), 404);
    });

    test("com identificador inválido (0) lança erro 400 e não consulta o repositório", async () => {
      await expectHttpError(service.findOne(0), 400);

      expect(repository.findOne).not.toHaveBeenCalled();
    });

    test("propaga a mesma instância de uma falha inesperada do repositório", async () => {
      const failure = new Error("falha inesperada em findOne");
      repository.findOne.mockRejectedValue(failure);

      await expect(service.findOne(123)).rejects.toBe(failure);
    });
  });

  describe("uso de spy", () => {
    test("observa findOne de um stub com jest.spyOn e confirma o identificador recebido", async () => {
      const course: Course = { id: 1, name: "Qualidade" };
      // Stub com métodos assíncronos (objeto existente, sem jest.fn).
      const stubRepository: CourseRepository = {
        create: async () => course,
        findAll: async () => [course],
        findOne: async () => course,
      };
      // Spy: observa o método real do stub sem trocar seu comportamento.
      const findOneSpy = jest.spyOn(stubRepository, "findOne");
      const spiedService = new CoursesService(stubRepository);

      const result = await spiedService.findOne(1);

      expect(result).toEqual(course);
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith(1);
    });
  });
});
