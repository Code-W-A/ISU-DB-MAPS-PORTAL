export type IndrumatorCauseItem = {
  id: string
  label: string
  code?: string
  isGroup: boolean
}

export type IndrumatorCauseSection = {
  id: string
  title: string
  description: string
  sourceArrayName: string
  expectedCount: number
  items: IndrumatorCauseItem[]
}

export type IndrumatorSelectedItems = Record<string, IndrumatorCauseItem | undefined>
