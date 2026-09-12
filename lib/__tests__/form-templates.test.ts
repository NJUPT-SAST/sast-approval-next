import { COLLEGES } from "@/lib/constants/colleges"
import { option, template } from "@/lib/constants/form-templates"
import type { SchemaNode } from "@/components/schema-form/types"

const names = (node: SchemaNode) => Object.keys(node.properties ?? {})

describe("项目提交表单模板", () => {
  it("保留旧版的三套模板与名称", () => {
    expect(option).toEqual(["创新杯模板", "公益创意模板", "挑战杯模板"])
    expect(template).toHaveLength(3)
  })

  it("创新杯模板字段与旧版一致", () => {
    expect(names(template[0])).toEqual([
      "学院",
      "项目名称",
      "项目类别",
      "项目简介",
      "是否为STITP项目",
      "申报书",
      "研究报告",
      "项目PPT",
      "视频等附件",
    ])
    expect(template[0].properties?.申报书.widget).toBe("customUpload")
    expect(template[0].properties?.申报书.props).toMatchObject({
      inputName: "申报书",
      accept: ".pdf",
    })
    expect(template[0].properties?.视频等附件.required).toBe(false)
  })

  it("公益创意模板字段与旧版一致", () => {
    expect(names(template[1])).toEqual([
      "项目名称",
      "项目类型",
      "活动策划书",
      "项目企划书",
      "项目企划书现有成果资料附录",
      "数字媒体项目",
      "数字媒体项目说明书",
      "数字媒体项目参考资料",
    ])
    expect(template[1].properties?.项目类型.enum).toEqual([
      "活动策划书",
      "项目企划书",
      "数字媒体项目",
    ])
  })

  it("挑战杯模板字段与旧版一致", () => {
    expect(names(template[2])).toEqual([
      "学院",
      "项目名称",
      "项目组别",
      "项目简介",
      "项目申报表",
      "创业计划书",
      "项目 PPT",
      "附件",
    ])
    expect(template[2].properties?.项目组别.enum).toHaveLength(5)
  })

  it("学院下拉沿用完整的 20 个学院，顺序即审核学院代号", () => {
    expect(COLLEGES).toHaveLength(20)
    expect(COLLEGES[0]).toBe("通信与信息工程学院")
    expect(COLLEGES[19]).toBe("波特兰学院")
    expect(template[0].properties?.学院.enum).toEqual([...COLLEGES])
    expect(template[0].properties?.学院.enumNames).toEqual([...COLLEGES])
  })
})
