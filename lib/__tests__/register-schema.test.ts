import {
  buildRegisterSchema,
  generateParticipantFields,
  generateTeacherFields,
} from "@/lib/constants/register-schema"

describe("报名表单 schema", () => {
  it("个人赛只渲染个人信息", () => {
    const schema = buildRegisterSchema({
      isTeam: false,
      minParti: 1,
      maxParti: 1,
      partiCount: 1,
      teacherCount: 0,
    })
    expect(Object.keys(schema.properties ?? {})).toEqual(["leader"])
    expect(schema.properties?.leader.title).toBe("个人信息")
  })

  it("团队赛包含队伍名称、指导老师与队员三块", () => {
    const schema = buildRegisterSchema({
      isTeam: true,
      minParti: 2,
      maxParti: 8,
      partiCount: 3,
      teacherCount: 2,
    })
    expect(Object.keys(schema.properties ?? {})).toEqual([
      "input_teamName",
      "listOfTeacher",
      "listOfParti",
    ])

    const parti = schema.properties?.listOfParti.properties ?? {}
    // 队员人数为 3 时，除队长外再生成 2 个队员表单
    expect(Object.keys(parti)).toEqual(["select_numOfParti", "leader", "parti1", "parti2"])
    expect(parti.select_numOfParti.min).toBe(2)
    expect(parti.select_numOfParti.max).toBe(8)
    expect(parti.select_numOfParti.default).toBe(3)

    const teacher = schema.properties?.listOfTeacher.properties ?? {}
    expect(Object.keys(teacher)).toEqual(["select_numOfTeacher", "teacher1", "teacher2"])
    expect(teacher.select_numOfTeacher.max).toBe(3)
  })

  it("队员字段包含姓名 / 学号 / 联系方式与对应校验规则", () => {
    const fields = generateParticipantFields(2)
    expect(Object.keys(fields)).toEqual(["parti1"])
    const props = fields.parti1.properties ?? {}
    expect(Object.keys(props)).toEqual(["name", "code", "contact"])
    expect(props.code.rules?.[0].message).toBe("请输入正确的学号")
    expect(props.contact.rules?.[0].message).toBe("请输入正确的手机号码")
  })

  it("学号与手机号正则与旧版一致", () => {
    const codeRule = generateParticipantFields(2).parti1.properties?.code.rules?.[0]
      .pattern as RegExp
    expect(codeRule.test("B21021021")).toBe(true)
    expect(codeRule.test("C26000614")).toBe(true)
    expect(codeRule.test("12345678901")).toBe(true)
    expect(codeRule.test("hello")).toBe(false)

    const contactRule = generateParticipantFields(2).parti1.properties?.contact.rules?.[0]
      .pattern as RegExp
    expect(contactRule.test("13800000000")).toBe(true)
    expect(contactRule.test("12345")).toBe(false)
  })

  it("指导老师字段为姓名 + 工号", () => {
    const fields = generateTeacherFields(1)
    expect(Object.keys(fields.teacher1.properties ?? {})).toEqual(["name", "code"])
    expect(fields.teacher1.properties?.code.title).toBe("工号")
  })

  it("人数为最小值时不生成额外队员表单", () => {
    const schema = buildRegisterSchema({
      isTeam: true,
      minParti: 1,
      maxParti: 15,
      partiCount: 1,
      teacherCount: 0,
    })
    expect(Object.keys(schema.properties?.listOfParti.properties ?? {})).toEqual([
      "select_numOfParti",
      "leader",
    ])
  })
})
