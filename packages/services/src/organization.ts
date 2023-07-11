import { prisma } from "@open-edu/db";
import slugify from "@sindresorhus/slugify";
import type { Config } from "unique-names-generator";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

const config: Config = {
  dictionaries: [adjectives, colors, animals],
  separator: "-",
};

export const countOrganizations = async (name: string) =>
  await prisma.organization.count({
    where: { name },
  });

export const createOrganization = async (
  name: string | undefined | null,
  userId: string
) => {
  const randomName: string = uniqueNamesGenerator(config);
  const userName = name ?? randomName;
  const count = await countOrganizations(userName);

  let name_ = userName;

  if (count > 0) {
    name_ = `${userName}-${count}`;
  }

  return prisma.organization.create({
    data: {
      name: name_,
      slug: slugify(name_),
      creatorId: userId,
      membership: {
        create: {
          role: "OWNER",
          status: "ACCEPTED",
          userId,
          inviter: userId,
        },
      },
    },
    select: {
      id: true,
      membership: { select: { role: true } },
    },
  });
};
