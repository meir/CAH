import Vue from 'vue'
import Router from 'vue-router'

import Index from '@/views/Index'
import Profile from '@/views/Profile'
import Cardpacks from '@/views/Cardpacks'
import Verification from '@/views/Verification'
import Reset from '@/views/Reset'
import ForgotPassword from '@/views/ForgotPassword'
import Room from '@/views/Room'
import WaitingRoom from '@/views/WaitingRoom'
import TOS from '@/views/TOS'

import Register from '@/views/Register'
import Login from '@/views/Login'
import Logout from '@/views/Logout'

import AuthService from '../services/AuthService'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'Index',
      component: Index,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: {
        guest: true
      }
    },
    {
      path: '/logout',
      name: 'Logout',
      component: Logout,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/register',
      name: 'Register',
      component: Register,
      meta: {
        guest: true
      }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: Profile,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/terms-and-conditions',
      name: 'TOS',
      component: TOS,
      meta: {
        requiresAuth: false
      }
    },
    {
      path: '/cardpacks',
      name: 'Cardpacks',
      component: Cardpacks,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/forgot-password',
      name: 'ForgotPassword',
      component: ForgotPassword,
      meta: {
        guest: true
      }
    },
    {
      path: '/verification/:uuid',
      name: 'Verification',
      component: Verification
    },
    {
      path: '/reset/:token',
      name: 'Reset',
      component: Reset
    },
    {
      path: '/room/:token',
      name: 'Room',
      component: Room,
      meta: {
        requiresAuth: true,
        keepRoomConnection: true
      }
    },
    {
      path: '/waitingroom/:token',
      name: 'WaitingRoom',
      component: WaitingRoom,
      meta: {
        requiresAuth: true,
        keepRoomConnection: true
      }
    }
  ]
})

router.beforeEach((to, from, next) => {
  AuthService.isAuthenticated().then(async (response) => {
    if (!to.matched.some(record => record.meta.keepRoomConnection) && window.socket) {
      const jwt = require('cookie').parse(document.cookie).jwt
      const methods = window.socket.import([
        'leaveRoom'
      ])
      await methods.leaveRoom(jwt)
    }
    if (to.matched.some(record => record.meta.requiresAuth)) {
      if (!response) {
        next({
          path: '/login'
        })
      } else {
        next()
      }
    } else if (to.matched.some(record => record.meta.guest)) {
      if (response === false) {
        next()
      } else {
        next({
          path: '/'
        })
      }
    } else {
      next()
    }
  })
})

export default router
