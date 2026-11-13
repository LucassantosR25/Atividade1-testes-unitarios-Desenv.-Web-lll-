import { HttpError } from "../../../src/errors";
import type {
  Enrollment,
  EnrollmentRepository,
} from "../../../src/modules/enrollments/enrollments.repository";
import { EnrollmentsService } from "../../../src/modules/enrollments/enrollments.service";

// Data fixa para que os testes sejam reproduzíveis.
const ENROLLED_AT = new Date("2026-01-15T12:00:00.000Z");

function buildEnrollment(studentRa = 123, courseId = 1): Enrollment {
  return { studentRa, courseId, enrolledAt: ENROLLED_AT };
}

function createRepositoryMock(): jest.Mocked<EnrollmentRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
}

async function expectHttpError(promise: Promise<unknown>, statusCode: number) {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(statusCode);
}

describe("EnrollmentsService", () => {
  let repository: jest.Mocked<EnrollmentRepository>;
  let service: EnrollmentsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new EnrollmentsService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    test("com dados válidos retorna a matrícula e passa RA e disciplina como argumentos separados, nessa ordem", async () => {
      const created = buildEnrollment(123, 1);
      repository.create.mockResolvedValue(created);

      const result = await service.create({ studentRa: 123, courseId: 1 });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(123, 1);
    });

    test.each([
      ["RA inválido (0)", { studentRa: 0, courseId: 1 }],
      ["ID da disciplina inválido (0)", { studentRa: 123, courseId: 0 }],
    ])(
      "com %s lança erro 400 e não chama repository.create",
      async (_cenario, input) => {
        await expectHttpError(service.create(input), 400);

        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    test("com aluno ou disciplina inexistente (código 23503) lança erro 404", async () => {
      repository.create.mockRejectedValue({ code: "23503" });

      await expectHttpError(
        service.create({ studentRa: 123, courseId: 1 }),
        404,
      );
    });

    test("com matrícula duplicada (código 23505) lança erro 409", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(
        service.create({ studentRa: 123, courseId: 1 }),
        409,
      );
    });

    test("propaga a mesma instância de uma falha inesperada na criação", async () => {
      const failure = new Error("falha inesperada em create");
      repository.create.mockRejectedValue(failure);

      await expect(
        service.create({ studentRa: 123, courseId: 1 }),
      ).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna a lista de matrículas e chama repository.findAll uma vez, sem argumentos", async () => {
      const enrollments = [buildEnrollment(123, 1), buildEnrollment(123, 2)];
      repository.findAll.mockResolvedValue(enrollments);

      const result = await service.findAll();

      expect(result).toEqual(enrollments);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith();
    });
  });

  describe("findOne", () => {
    test("retorna a matrícula existente e encaminha RA e disciplina ao repositório uma única vez", async () => {
      const enrollment = buildEnrollment(123, 1);
      repository.findOne.mockResolvedValue(enrollment);

      const result = await service.findOne(123, 1);

      expect(result).toEqual(enrollment);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123, 1);
    });

    test("lança erro 404 quando a matrícula não existe e encaminha os dois identificadores na ordem correta", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123, 1), 404);

      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123, 1);
    });
  });
});
