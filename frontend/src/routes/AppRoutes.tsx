import { Navigate, Route, Routes } from 'react-router'
import { CashPage } from '../features/cash/CashPage'
import { ProductsPage } from '../features/catalog/ProductsPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { OrdersPage } from '../features/orders/OrdersPage'
import { PosPage } from '../features/pos/PosPage'
import { TeamPage } from '../features/team/TeamPage'
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
          <Route path="pdv" element={<PosPage />} />
          <Route path="pedidos" element={<OrdersPage />} />
          <Route path="caixa" element={<CashPage />} />

          <Route element={<RequireRole role="owner" />}>
            <Route path="painel" element={<DashboardPage />} />
            <Route path="produtos" element={<ProductsPage />} />
            <Route path="equipe" element={<TeamPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
