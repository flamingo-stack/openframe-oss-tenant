<template>
  <div class="dashboard">
    <div class="coming-soon">
      <i class="pi pi-clock"></i>
      <h1>Coming Soon</h1>
      <p>The Dashboard feature is currently under development.</p>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.coming-soon {
  text-align: center;
  color: var(--text-color-secondary);
}

.coming-soon i {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.coming-soon h1 {
  font-size: 2rem;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.coming-soon p {
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.8;
}
</style>
