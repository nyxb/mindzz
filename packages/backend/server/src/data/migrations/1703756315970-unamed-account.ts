import type { UserType } from '../../modules/users';
import { PrismaService } from '../../prisma';

export class UnamedAccount1703756315970 {
  // do the migration
  static async up(db: PrismaService) {
    await db.$transaction(async tx => {
      // only find users with empty names
      const users = await db.$queryRaw<
        UserType[]
      >`SELECT * FROM users WHERE name ~ E'^[\\s\\u2000-\\u200F]*$';`;
      console.log(
        `renaming ${users.map(({ email }) => email).join('|')} users`
      );

      await Promise.all(
        users.map(({ id, email }) =>
          tx.user.update({
            where: { id },
            data: {
              name: email.split('@')[0],
            },
          })
        )
      );
    });
  }

  // revert the migration
  static async down(_db: PrismaService) {}
}
