const prisma = require('./lib/prisma');

const drinkCatalog = [
  { name: 'Coke', image: 'CherryPop_S.png' },
  { name: 'Sprite', image: 'BlueBerryRaspberry_S.png' },
  { name: 'Water', image: 'JuicedPearl_S.png' },
  { name: 'Juice', image: 'JuicedPeach_L.png' },
  { name: 'Tea', image: 'LongDrinkPear_S.png' },
  { name: 'Coffee', image: 'RaspberryLemon_S.png' },
  { name: 'Lemonade', image: 'StrawberryLime_S.png' },
];

async function ensureDrink(drink) {
  let existingDrink = await prisma.drink.findUnique({ where: { name: drink.name } });

  if (!existingDrink) {
    existingDrink = await prisma.drink.create({
      data: {
        name: drink.name,
        image: drink.image,
      },
    });
  }

  if (!existingDrink.image && drink.image) {
    existingDrink = await prisma.drink.update({
      where: { id: existingDrink.id },
      data: { image: drink.image },
    });
  }

  return existingDrink;
}

async function main() {
  const users = [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Michael', email: 'michael@example.com' },
    { id: 3, name: 'Arthur', email: 'arthur@example.com' },
  ];

  for (const user of users) {
    const existingUser = await prisma.user.findUnique({ where: { id: user.id } });

    if (existingUser) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: user.name, email: user.email },
      });
    } else {
      await prisma.user.create({
        data: { name: user.name, email: user.email },
      });
    }
  }

  await prisma.userDrink.deleteMany({
    where: {
      userId: { in: users.map((user) => user.id) },
    },
  });

  const drinkNames = drinkCatalog.map((drink) => drink.name);

  for (const user of users) {
    const shuffledDrinks = [...drinkNames].sort(() => Math.random() - 0.5);
    const selectedDrinks = shuffledDrinks.slice(0, 3);

    for (const drinkName of selectedDrinks) {
      const drinkRecord = drinkCatalog.find((catalogDrink) => catalogDrink.name === drinkName);
      const drink = await ensureDrink(drinkRecord);
      const amount = Math.floor(Math.random() * 3) + 1;

      await prisma.userDrink.create({
        data: {
          userId: user.id,
          drinkId: drink.id,
          amount,
        },
      });
    }
  }

  console.log('Seeded users and drinks successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
