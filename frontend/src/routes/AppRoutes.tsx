import { Navigate, Route, Routes } from 'react-router'
import { FeaturePlaceholder } from '../components/ui/FeaturePlaceholder'
import { AppLayout } from '../layouts/AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RequireAuth, RequireRole } from './guards'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="entrar" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/pdv" replace />} />
          <Route
            path="pdv"
            element={<FeaturePlaceholder title="Vender" description="Monte a comanda e finalize o pedido." />}
          />
          <Route
            path="pedidos"
            element={<FeaturePlaceholder title="Pedidos" description="Acompanhe o preparo e as entregas." />}
          />
          <Route
            path="caixa"
            element={<FeaturePlaceholder title="Caixa" description="Abertura, movimentações e fechamento." />}
          />

          <Route element={<RequireRole role="owner" />}>
            <Route
              path="painel"
              element={<FeaturePlaceholder title="Painel" description="Vendas e recebimentos do período." />}
            />
            <Route
              path="produtos"
              element={<FeaturePlaceholder title="Produtos" description="Catálogo e categorias." />}
            />
            <Route
              path="equipe"
              element={<FeaturePlaceholder title="Equipe" description="Pessoas com acesso ao sistema." />}
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
