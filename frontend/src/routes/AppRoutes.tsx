
import { Routes, Route } from 'react-router'
import { AppLayout } from '../layouts/AppLayout'
import { FeaturePlaceholder } from '../components/ui/FeaturePlaceholder'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <FeaturePlaceholder
              title="Dashboard"
              description="Visão geral das vendas e indicadores."
            />
          }
        />

        <Route
          path="pdv"
          element={
            <FeaturePlaceholder
              title="Ponto de Venda"
              description="Registro rápido de pedidos e comandas."
            />
          }
        />

        <Route
          path="pedidos"
          element={
            <FeaturePlaceholder
              title="Pedidos"
              description="Acompanhamento do preparo e das entregas."
            />
          }
        />

        <Route
          path="caixa"
          element={
            <FeaturePlaceholder
              title="Caixa"
              description="Recebimentos e movimentações financeiras."
            />
          }
        />

        <Route
          path="produtos"
          element={
            <FeaturePlaceholder
              title="Produtos"
              description="Gestão do catálogo e das categorias."
            />
          }
        />

        <Route
          path="*"
          element={
            <FeaturePlaceholder
              title="Página não encontrada"
              description="A rota solicitada não existe."
            />
          }
        />
      </Route>
    </Routes>
  )
}
