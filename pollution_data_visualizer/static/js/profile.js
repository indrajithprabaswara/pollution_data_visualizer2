document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const city = btn.dataset.city;
      fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city })
      }).then(() => btn.closest('tr').remove());
    });
  });
  document.getElementById('saveFavs').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('#favorites-body tr').forEach(row => {
      const city = row.dataset.city;
      const alertVal = row.querySelector('.alert-input').value;
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, alert: parseInt(alertVal,10) })
      });
    });
    showToast('Saved', 'success', 3000);
  });
});
