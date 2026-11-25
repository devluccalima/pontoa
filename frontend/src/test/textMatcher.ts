/**
 * Encontra o elemento mais interno com exatamente este texto, tratando o espaço
 * inquebrável do formatador de moeda como espaço comum: "R$ 18,50".
 */
export function textMatcher(text: string) {
  const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim()
  return (_: string, element: Element | null) =>
    normalize(element?.textContent) === text &&
    ![...(element?.children ?? [])].some((child) => normalize(child.textContent) === text)
}
