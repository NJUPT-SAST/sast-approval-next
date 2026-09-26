import type { SchemaNode } from "@/components/schema-form/types"
import { PHONE_PATTERN, STUDENT_CODE_PATTERN } from "@/lib/validation"

/** 学号校验规则，与一键导入共用同一条正则 */
const CODE_RULE = {
  pattern: STUDENT_CODE_PATTERN,
  message: "请输入正确的学号",
}

/** 手机号校验规则 */
const CONTACT_RULE = {
  pattern: PHONE_PATTERN,
  message: "请输入正确的手机号码",
}

const leaderNode = (title: string, description: string): SchemaNode => ({
  title,
  type: "object",
  displayType: "column",
  description,
  properties: {
    name: { title: "姓名", type: "string", readOnly: true, props: {} },
    code: { title: "学号", type: "string", readOnly: true, props: {} },
    contact: { title: "联系方式", type: "string", readOnly: true, props: {} },
  },
})

/** 生成队员信息字段，等价于旧版 generateForm */
export function generateParticipantFields(count: number): Record<string, SchemaNode> {
  const fields: Record<string, SchemaNode> = {}
  for (let i = 1; i <= count - 1; i += 1) {
    fields[`parti${i}`] = {
      title: `队员${i}信息`,
      type: "object",
      displayType: "column",
      properties: {
        name: { title: "姓名", type: "string", required: true, props: {} },
        code: { title: "学号", type: "string", required: true, rules: [CODE_RULE], props: {} },
        contact: {
          title: "联系方式（手机号码）",
          type: "string",
          required: true,
          rules: [CONTACT_RULE],
          props: {},
        },
      },
    }
  }
  return fields
}

/** 生成指导老师字段，等价于旧版 generateTeacherForm */
export function generateTeacherFields(count: number): Record<string, SchemaNode> {
  const fields: Record<string, SchemaNode> = {}
  for (let i = 1; i <= count; i += 1) {
    fields[`teacher${i}`] = {
      title: `指导老师${i}信息`,
      type: "object",
      displayType: "column",
      properties: {
        name: { title: "姓名", type: "string", required: true, props: {} },
        code: { title: "工号", type: "string", required: true, props: {} },
      },
    }
  }
  return fields
}

export type RegisterSchemaOptions = {
  isTeam: boolean
  minParti: number
  maxParti: number
  partiCount: number
  teacherCount: number
  maxTeacher?: number
}

/**
 * 根据比赛报名配置生成报名表单 schema。
 * 结构与旧版 form-render schema 完全一致，因此提交数据格式不变。
 */
export function buildRegisterSchema({
  isTeam,
  minParti,
  maxParti,
  partiCount,
  teacherCount,
  maxTeacher = 5,
}: RegisterSchemaOptions): SchemaNode {
  if (!isTeam) {
    return {
      type: "object",
      labelWidth: 151,
      displayType: "column",
      properties: {
        leader: leaderNode("个人信息", "信息取自你的账号，如有误请联系管理员"),
      },
    }
  }

  return {
    type: "object",
    labelWidth: 151,
    displayType: "column",
    properties: {
      input_teamName: {
        title: "队伍名称",
        type: "string",
        displayType: "column",
        required: true,
        labelWidth: 0,
        props: {},
      },
      listOfTeacher: {
        type: "object",
        title: "指导老师",
        properties: {
          select_numOfTeacher: {
            title: "指导老师人数",
            type: "number",
            widget: "slider",
            displayType: "column",
            description: `最多人数 ${maxTeacher}`,
            required: true,
            min: 0,
            max: maxTeacher,
            default: teacherCount,
          },
          ...generateTeacherFields(teacherCount),
        },
      },
      listOfParti: {
        type: "object",
        title: "参赛队员",
        properties: {
          select_numOfParti: {
            title: "队员人数",
            type: "number",
            widget: "slider",
            displayType: "column",
            description: `最少人数 ${minParti} ；最多人数 ${maxParti}`,
            required: true,
            min: minParti,
            max: maxParti,
            default: partiCount,
          },
          leader: leaderNode("队长信息", "队长信息已自动填写"),
          ...generateParticipantFields(partiCount),
        },
      },
    },
  }
}
