// -----------------------------------------------------------------------------
// CAMADA DE SERVIÇOS — ponto único de acesso a dados da aplicação.
//
// Importar deste barril garante que TODOS os resolvedores locais estejam
// registrados antes da primeira consulta (os módulos se auto-registram ao
// serem carregados).
//
//   import { newsService, intelligenceService } from '../services'
//
// Para ligar um backend real: defina VITE_DATA_MODE=api e VITE_API_BASE_URL.
// Nenhum componente precisa ser alterado — os contratos são os mesmos.
// -----------------------------------------------------------------------------
export { newsService } from './newsService'
export { searchService } from './searchService'
export { intelligenceService } from './intelligenceService'
export { adminService } from './adminService'

export { request, ApiError, listEndpoints } from './client'
export {
  DATA_MODE, API_BASE_URL, APP_NAME, APP_VERSION, isDemoMode, SETTINGS_STORAGE_KEY,
  REFERENCE_DATE, referenceDate,
} from './config'
