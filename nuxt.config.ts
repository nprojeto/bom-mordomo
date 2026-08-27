export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  app: {
    // Nome do repositorio no GitHub. Se mudar o repo, mude aqui tambem.
    baseURL: '/bom-mordomo/',
    buildAssetsDir: 'assets',
    head: {
      title: 'Sow Well Everyday',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#008474' },
        { name: 'description', content: 'Sow Well Everyday — o controle financeiro da família.' }
      ],
      link: [
        // porquinho da marca, embutido para carregar sempre
        { rel: 'icon', type: 'image/png',
          href: 'data:image/png;base64,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' },
        { rel: 'apple-touch-icon', href: '/bom-mordomo/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap'
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=block'
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
