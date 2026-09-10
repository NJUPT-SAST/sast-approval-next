/**
 * 审核者学院下拉测试。
 *
 * 核心回归点：学院代号必须来自后端返回的 id，不能再用「数组下标 + 1」推导。
 * 因此用例特意使用**非连续**的 id（3 / 7），下标推导会得到 1 / 2，与 id 不同，
 * 断言才有区分度。
 */
import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReviewerSet } from "@/components/competition/reviewer-set"
import type { Department } from "@/lib/types/api"

const DEPARTMENTS: Department[] = [
  { id: 3, name: "集成电路科学与工程学院" },
  { id: 7, name: "材料科学与工程学院" },
]

function setup(overrides: Partial<React.ComponentProps<typeof ReviewerSet>> = {}) {
  const setKey = jest.fn()
  const setValue = jest.fn()
  render(
    <ReviewerSet
      value={{ key: -1, value: "" }}
      index={0}
      setKey={setKey}
      setValue={setValue}
      departments={DEPARTMENTS}
      {...overrides}
    />
  )
  return { setKey, setValue }
}

describe("ReviewerSet 学院下拉", () => {
  it("选中学院时回传后端 id，而不是数组下标 + 1", async () => {
    const user = userEvent.setup()
    const { setKey } = setup()

    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "材料科学与工程学院" }))

    // 该项下标为 1，下标推导会得到 2；正确值是后端 id 7
    expect(setKey).toHaveBeenCalledWith(0, 7)
    expect(setKey).not.toHaveBeenCalledWith(0, 2)
  })

  it("第一项同样使用后端 id", async () => {
    const user = userEvent.setup()
    const { setKey } = setup()

    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "集成电路科学与工程学院" }))

    // 下标 0 推导会得到 1，正确值是 3
    expect(setKey).toHaveBeenCalledWith(0, 3)
    expect(setKey).not.toHaveBeenCalledWith(0, 1)
  })

  it("已保存的学院代号在后端列表中不存在时，显式提示而不是空白", () => {
    setup({ value: { key: 99, value: "B21021021" } })

    expect(screen.getByText("该学院已不存在，请重新选择。")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveTextContent("未知学院")
  })

  it("学院代号能对上时不出现失效提示", () => {
    setup({ value: { key: 7, value: "B21021021" } })

    expect(screen.queryByText("该学院已不存在，请重新选择。")).not.toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveTextContent("材料科学与工程学院")
  })

  it("学院列表加载中时禁用下拉", () => {
    setup({ departmentsLoading: true })

    expect(screen.getByRole("combobox")).toBeDisabled()
  })
})
