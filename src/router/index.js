import { createRouter, createWebHistory } from 'vue-router'
import GenerateView from '../views/GenerateView.vue'
import UpscalerView from '../views/UpscalerView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'generate',
      component: GenerateView,
    },
    {
      path: '/upscaler',
      name: 'upscaler',
      component: UpscalerView,
    },
  ],
})

export default router
