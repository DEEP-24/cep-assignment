import { PrismaClient } from "@prisma/client";
export function singleton<Value>(name: string, value: () => Value): Value {
  const yolo = global as any;
  yolo.__singletons ??= {};
  yolo.__singletons[name] ??= value();
  return yolo.__singletons[name];
}

const prisma = singleton("prisma", () => new PrismaClient());
prisma.$connect();

export { prisma };
