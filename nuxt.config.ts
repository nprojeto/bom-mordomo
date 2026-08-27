export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  app: {
    // Nome do repositorio no GitHub. Se mudar o repo, mude AQUI e o resto
    // se ajusta sozinho: os caminhos de imagem saem do helper arquivo().
    baseURL: '/sowwell/',
    buildAssetsDir: 'assets',
    head: {
      title: 'Sow Well Everyday',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#E7CFA3' },
        { name: 'description', content: 'Sow Well Everyday — o controle financeiro da família.' }
      ],
      link: [
        // porquinho da marca, embutido para carregar sempre
        { rel: 'icon', type: 'image/png',
          href: 'data:image/png;base64,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' },
        { rel: 'apple-touch-icon', href: '/sowwell/apple-touch-icon.png' },
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
