const drinkImageOptions = [
  'BlueBerryRaspberry_S.png',
  'CherryPop_S.png',
  'JuicedPeach_L.png',
  'JuicedPearl_S.png',
  'LongDrinkPear_S.png',
  'RaspberryLemon_S.png',
  'StrawberryLime_S.png',
];

async function loadUsers() {
  const response = await fetch('/api/users');
  const users = await response.json();
  const container = document.getElementById('users');
  const userSelect = document.getElementById('user-select');
  const orderSelectors = document.getElementById('order-selectors');

  userSelect.innerHTML = users
    .map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`)
    .join('');

  orderSelectors.innerHTML = users
    .map((user) => {
      const drinkOptions = (user.userDrinks || [])
        .filter((entry) => entry.drink)
        .map(
          (entry) =>
            `<option value="${entry.drink.id}" data-image="${escapeHtml(entry.drink?.image || drinkImageOptions[0])}">${escapeHtml(entry.drink.name)} (${entry.amount})</option>`
        )
        .join('');

      return `
        <label class="order-user-picker">
          <span>${escapeHtml(user.name)}</span>
          <div class="order-picker-row">
            <select class="order-select" data-user-id="${user.id}" ${drinkOptions ? '' : 'disabled'}>
              <option value="">Select a drink</option>
              ${drinkOptions}
            </select>
            <img class="order-preview-image" src="/img/${drinkImageOptions[0]}" alt="Drink preview" />
          </div>
        </label>
      `;
    })
    .join('');

  updateOrderPreviewImages();

  container.innerHTML = users
    .map(
      (user) => `
        <section class="user-card">
          <h2>${escapeHtml(user.name)}</h2>
          <p class="email">${escapeHtml(user.email || '')}</p>
          <h3>Drinks</h3>
          <ul>
            ${
              user.userDrinks && user.userDrinks.length
                ? user.userDrinks
                    .map(
                      (entry) => `
                        <li>
                          <div class="drink-entry">
                            <img
                              class="drink-image"
                              src="/img/${escapeHtml(entry.drink?.image || drinkImageOptions[0])}"
                              alt="${escapeHtml(entry.drink?.name || 'Drink')}"
                            />
                            <strong>${escapeHtml(entry.drink?.name || 'Unknown drink')}</strong>
                          </div>
                          <div class="drink-actions">
                            <span>× ${entry.amount}</span>
                            <button type="button" class="remove-drink-button" data-user-id="${user.id}" data-drink-id="${entry.drink?.id}">Remove</button>
                          </div>
                        </li>
                      `
                    )
                    .join('')
                : '<li>No drinks yet</li>'
            }
          </ul>
        </section>
      `
    )
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function populateImageSelect() {
  const imageSelect = document.getElementById('drink-image');
  imageSelect.innerHTML = drinkImageOptions
    .map((image) => `<option value="${escapeHtml(image)}">${escapeHtml(image)}</option>`)
    .join('');
}

async function handleUserFormSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  const message = document.getElementById('user-form-message');

  if (!name) {
    message.textContent = 'Please provide a name.';
    return;
  }

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email: null }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.details || result.error || 'Could not create user');
    }

    message.textContent = `Created ${name} successfully.`;
    form.reset();
    await loadUsers();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function handleDrinkFormSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const userId = formData.get('userId');
  const name = String(formData.get('name') || '').trim();
  const image = String(formData.get('image') || '').trim();
  const amount = Number(formData.get('amount') || 1);
  const message = document.getElementById('form-message');

  if (!name || !image || !userId || !Number.isInteger(amount) || amount < 1) {
    message.textContent = 'Please provide a drink name, image, and valid amount.';
    return;
  }

  try {
    const response = await fetch(`/api/users/${userId}/drinks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, image, amount }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.details || result.error || 'Could not add drink');
    }

    message.textContent = `Added ${name} successfully.`;
    form.reset();
    document.getElementById('drink-image').value = drinkImageOptions[0];
    document.getElementById('drink-amount').value = '1';
    await loadUsers();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function handleRemoveDrinkClick(event) {
  const button = event.target.closest('.remove-drink-button');
  if (!button) {
    return;
  }

  const userId = button.dataset.userId;
  const drinkId = button.dataset.drinkId;

  if (!userId || !drinkId) {
    return;
  }

  try {
    const response = await fetch(`/api/users/${userId}/drinks/${drinkId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.details || result.error || 'Could not remove drink');
    }

    await loadUsers();
  } catch (error) {
    document.getElementById('order-message').textContent = error.message;
  }
}

async function handleOrderApply(event) {
  event.preventDefault();
  const selects = Array.from(document.querySelectorAll('.order-select'));
  const selections = selects
    .map((select) => ({
      userId: select.dataset.userId,
      drinkId: select.value,
    }))
    .filter((selection) => selection.userId && selection.drinkId);

  const message = document.getElementById('order-message');

  if (!selections.length) {
    message.textContent = 'Select one drink for at least one person before applying.';
    return;
  }

  try {
    const response = await fetch('/api/orders/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ selections }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.details || result.error || 'Could not apply order');
    }

    message.textContent = 'Order applied successfully.';
    await loadUsers();
  } catch (error) {
    message.textContent = error.message;
  }
}

function updateOrderPreviewImages() {
  document.querySelectorAll('.order-select').forEach((select) => {
    const selectedOption = select.options[select.selectedIndex];
    const preview = select.parentElement.querySelector('.order-preview-image');
    const selectedImage = selectedOption?.dataset.image || drinkImageOptions[0];

    if (preview) {
      preview.src = `/img/${selectedImage}`;
      preview.alt = selectedOption?.textContent || 'Drink preview';
    }
  });
}

populateImageSelect();

document.getElementById('user-form').addEventListener('submit', handleUserFormSubmit);
document.getElementById('drink-form').addEventListener('submit', handleDrinkFormSubmit);
document.addEventListener('click', handleRemoveDrinkClick);
document.getElementById('order-form').addEventListener('submit', handleOrderApply);
document.addEventListener('change', (event) => {
  if (event.target.classList.contains('order-select')) {
    updateOrderPreviewImages();
  }
});

loadUsers().catch((error) => {
  document.getElementById('users').innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
});
