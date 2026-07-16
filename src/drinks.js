// File for HTTP requests to the drinks API

const express = require('express');
const router = express.Router();
const prisma = require('./lib/prisma');

const parseId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('Invalid id');
  }
  return id;
};

const removeOneDrinkFromUser = async (userId, drinkId) => {
  const existingEntry = await prisma.userDrink.findUnique({
    where: {
      userId_drinkId: {
        userId,
        drinkId,
      },
    },
    include: {
      drink: true,
      user: true,
    },
  });

  if (!existingEntry) {
    throw new Error('Drink not found for user');
  }

  if (existingEntry.amount <= 1) {
    await prisma.userDrink.delete({
      where: {
        id: existingEntry.id,
      },
    });

    return {
      deleted: true,
      user: existingEntry.user,
      drink: existingEntry.drink,
      remainingAmount: 0,
    };
  }

  const updatedEntry = await prisma.userDrink.update({
    where: {
      id: existingEntry.id,
    },
    data: {
      amount: existingEntry.amount - 1,
    },
    include: {
      drink: true,
      user: true,
    },
  });

  return {
    deleted: false,
    user: updatedEntry.user,
    drink: updatedEntry.drink,
    remainingAmount: updatedEntry.amount,
  };
};

const getDrinkName = (value) => {
  if (typeof value !== 'string') {
    throw new Error('Drink name is required');
  }

  const name = value.trim();
  if (!name) {
    throw new Error('Drink name is required');
  }

  return name;
};

const getDrinkImage = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value).trim();
};

const findOrCreateDrink = async ({ drinkId, name, image }) => {
  if (drinkId !== undefined && drinkId !== null) {
    const parsedDrinkId = parseId(drinkId);
    const existingDrink = await prisma.drink.findUnique({
      where: { id: parsedDrinkId },
    });

    if (!existingDrink) {
      throw new Error('Drink not found');
    }

    return existingDrink;
  }

  const drinkName = getDrinkName(name);
  const drinkImage = getDrinkImage(image);

  const existingDrink = await prisma.drink.findUnique({
    where: { name: drinkName },
  });

  if (existingDrink) {
    if (drinkImage && !existingDrink.image) {
      return prisma.drink.update({
        where: { id: existingDrink.id },
        data: { image: drinkImage },
      });
    }

    return existingDrink;
  }

  return prisma.drink.create({
    data: {
      name: drinkName,
      image: drinkImage,
    },
  });
};

// User routes
router.post('/', async (req, res) => {
  const { name, email } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const newUser = await prisma.user.create({
      data: { name, email: email ?? null },
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: 'Could not create user', details: error.message });
  }
});

router.post('/users', async (req, res) => {
  req.body = req.body || {};
  const { name, email } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const newUser = await prisma.user.create({
      data: { name, email: email ?? null },
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: 'Could not create user', details: error.message });
  }
});

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    include: {
      userDrinks: {
        include: {
          drink: true,
        },
      },
    },
  });
  res.json(users);
});

router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseId(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userDrinks: {
          include: {
            drink: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const userId = parseId(req.params.id);
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ error: 'At least one field is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: 'Could not update user', details: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseId(req.params.id);
    await prisma.user.delete({ where: { id: userId } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Could not delete user', details: error.message });
  }
});

// Drink routes
router.get('/drinks', async (req, res) => {
  const drinks = await prisma.drink.findMany();
  res.json(drinks);
});

router.post('/drinks', async (req, res) => {
  const { name, image } = req.body;

  try {
    const drinkName = getDrinkName(name);
    const drinkImage = getDrinkImage(image);

    const newDrink = await prisma.drink.upsert({
      where: { name: drinkName },
      update: {
        image: drinkImage ?? undefined,
      },
      create: {
        name: drinkName,
        image: drinkImage,
      },
    });

    res.status(201).json(newDrink);
  } catch (error) {
    res.status(400).json({ error: 'Could not create drink', details: error.message });
  }
});

router.get('/drinks/:id', async (req, res) => {
  try {
    const drinkId = parseId(req.params.id);
    const drink = await prisma.drink.findUnique({
      where: { id: drinkId },
      include: {
        userDrinks: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!drink) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    res.json(drink);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/drinks/:id', async (req, res) => {
  try {
    const drinkId = parseId(req.params.id);
    const { name, image } = req.body;

    if (!name && image === undefined) {
      return res.status(400).json({ error: 'Name or image is required' });
    }

    const updatedDrink = await prisma.drink.update({
      where: { id: drinkId },
      data: {
        ...(name ? { name: getDrinkName(name) } : {}),
        ...(image !== undefined ? { image: getDrinkImage(image) } : {}),
      },
    });

    res.json(updatedDrink);
  } catch (error) {
    res.status(400).json({ error: 'Could not update drink', details: error.message });
  }
});

router.delete('/drinks/:id', async (req, res) => {
  try {
    const drinkId = parseId(req.params.id);
    await prisma.drink.delete({ where: { id: drinkId } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Could not delete drink', details: error.message });
  }
});

// User-drink routes
router.get('/users/:userId/drinks', async (req, res) => {
  try {
    const userId = parseId(req.params.userId);
    const userDrinks = await prisma.userDrink.findMany({
      where: { userId },
      include: { drink: true },
    });
    res.json(userDrinks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/users/:userId/drinks', async (req, res) => {
  try {
    const userId = parseId(req.params.userId);
    const { drinkId, name, image, amount = 1 } = req.body;
    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedAmount) || parsedAmount < 1) {
      return res.status(400).json({ error: 'Amount must be a positive integer' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const drink = await findOrCreateDrink({ drinkId, name, image });
    const existingEntry = await prisma.userDrink.findUnique({
      where: {
        userId_drinkId: {
          userId,
          drinkId: drink.id,
        },
      },
    });

    const entry = existingEntry
      ? await prisma.userDrink.update({
          where: {
            id: existingEntry.id,
          },
          data: {
            amount: existingEntry.amount + parsedAmount,
          },
        })
      : await prisma.userDrink.create({
          data: {
            userId,
            drinkId: drink.id,
            amount: parsedAmount,
          },
        });

    res.status(existingEntry ? 200 : 201).json(entry);
  } catch (error) {
    res.status(400).json({ error: 'Could not add drink to user', details: error.message });
  }
});

router.put('/users/:userId/drinks/:drinkId', async (req, res) => {
  try {
    const userId = parseId(req.params.userId);
    const drinkId = parseId(req.params.drinkId);
    const { amount } = req.body;

    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount < 1) {
      return res.status(400).json({ error: 'Amount must be a positive integer' });
    }

    const entry = await prisma.userDrink.upsert({
      where: {
        userId_drinkId: {
          userId,
          drinkId,
        },
      },
      update: { amount: parsedAmount },
      create: {
        userId,
        drinkId,
        amount: parsedAmount,
      },
    });

    res.json(entry);
  } catch (error) {
    res.status(400).json({ error: 'Could not update drink amount', details: error.message });
  }
});

router.delete('/users/:userId/drinks/:drinkId', async (req, res) => {
  try {
    const userId = parseId(req.params.userId);
    const drinkId = parseId(req.params.drinkId);

    const result = await removeOneDrinkFromUser(userId, drinkId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: 'Could not remove drink from user', details: error.message });
  }
});

router.post('/orders/apply', async (req, res) => {
  try {
    const selections = Array.isArray(req.body?.selections) ? req.body.selections : [];

    if (!selections.length) {
      return res.status(400).json({ error: 'At least one drink selection is required' });
    }

    const webhookUrl = process.env.DC_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(500).json({ error: 'Discord webhook URL is not configured' });
    }

    const payload = {
      content: 'Drink request!',
      embeds: [],
    };

    for (const selection of selections) {
      const userId = parseId(selection.userId);
      const drinkId = parseId(selection.drinkId);

      const result = await removeOneDrinkFromUser(userId, drinkId);

      payload.embeds.push({
        title: `Person ${result.user.id}:`,
        description: `**${result.drink.name}**`,
        color: 3447003,
        image: {
          url: `http://localhost:3000/img/${result.drink.image || 'BlueBerryRaspberry_S.png'}`,
        },
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Discord webhook request failed');
    }

    res.json({ success: true, removed: selections.length, webhook: 'sent' });
  } catch (error) {
    res.status(400).json({ error: 'Could not apply drink order', details: error.message });
  }
});

module.exports = router;