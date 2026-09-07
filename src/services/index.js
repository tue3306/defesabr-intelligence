// -----------------------------------------------------------------------------
// CAMADA DE SERVIÇOS — ponto único de acesso a dados da aplicação.
//
//   import { newsService, intelligenceService } from '../services'
//
// Toda leitura desemboca em `client.js`, que fala com a API e mais nada. Não
// há modo a configurar: a ponte usa o caminho relativo `/api`, que o Vite
// encaminha em desenvolvimento e que o próprio servidor atende em produção.
//
// O texto anterior dizia que este barril existia para "garantir que TODOS os
// resolvedores locais estejam registrados antes da primeira consulta" e que
// bastava definir `VITE_DATA_MODE=api` para ligar um backend real. Os
// resolvedores locais saíram, e a variável nunca foi lida por ninguém —
// instrução que não funciona mais é pior que instrução ausente, porque quem a
// segue conclui que o problema é dele.
// -----------------------------------------------------------------------------
export { newsService } from './newsService'
export { searchService } from './searchService'
export { intelligenceService } from './intelligenceService'
export { adminService } from './adminService'

export { request, ApiError, listEndpoints } from './client'
export { API_BASE_URL, APP_NAME, APP_VERSION, SETTINGS_STORAGE_KEY } from './config'
