export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  app: {
    // Nome do repositorio no GitHub. Se mudar o repo, mude aqui tambem.
    baseURL: '/bom-mordomo/',
    buildAssetsDir: 'assets',
    head: {
      title: 'Bom Mordomo',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#16211F' },
        { name: 'description', content: 'Controle financeiro da casa.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap'
        }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      supabaseUrl: 'https://fryfijwveqwdssufkprt.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeWZpand2ZXF3ZHNzdWZrcHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MTk4NjgsImV4cCI6MjEwMzA5NTg2OH0.EB2xo6PR9Bye-Beoxmn00qLKQh4pmby2yTIQ33Y0nSs'
    }
  }
})
