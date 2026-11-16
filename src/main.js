import { createApp } from 'vue'
import App from './App.vue'
import './styles/gum-bento.css'
import { installI18n } from './i18n'

const app = createApp(App)
installI18n(app)
app.mount('#app')
