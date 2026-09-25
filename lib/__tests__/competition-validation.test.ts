import {
  buildReviewSettings,
  reviewSettingsFromApi,
  validateCompetition,
  type ReviewSetting,
} from "@/lib/competition-validation"
import type { CompetitionInfoType } from "@/lib/types/api"

const VALID: CompetitionInfoType = {
  name: "程序设计大赛",
  reg_begin_time: "2026-09-01 00:00:00",
  reg_end_time: "2026-09-10 23:59:59",
  submit_begin_time: "2026-09-11 00:00:00",
  submit_end_time: "2026-09-20 23:59:59",
  review_begin_time: "2026-09-21 00:00:00",
  review_end_time: "2026-09-30 23:59:59",
  table: {},
  type: 0,
  min_team_members: 1,
  max_team_members: 1,
  user_code: "B21031234",
  is_review: 0,
  introduce: "比赛简介",
  cover: "",
}

const withInfo = (patch: Partial<CompetitionInfoType>) => ({ ...VALID, ...patch })

describe("validateCompetition", () => {
  it("信息完整时没有问题", () => {
    expect(validateCompetition(VALID, [{ key: 0, value: "" }], 1)).toBeNull()
  })

  it("名称与简介必填，并指向对应控件", () => {
    expect(validateCompetition(withInfo({ name: "  " }), [], 1)?.field).toBe("competition-name")
    expect(validateCompetition(withInfo({ introduce: "" }), [], 1)?.field).toBe(
      "competition-introduce"
    )
  })

  it("阶段时间缺失时指向缺失的那一端", () => {
    expect(validateCompetition(withInfo({ reg_begin_time: "" }), [], 1)).toEqual({
      field: "signUp-start",
      message: "请选择报名开始时间",
    })
    expect(validateCompetition(withInfo({ review_end_time: "" }), [], 1)?.field).toBe("review-end")
  })

  it("截止时间不能早于或等于开始时间", () => {
    const issue = validateCompetition(withInfo({ submit_end_time: "2026-09-11 00:00:00" }), [], 1)
    expect(issue).toEqual({ field: "submit-end", message: "材料提交截止时间要晚于开始时间" })
  })

  it("兼容后端 . 分隔的时间格式", () => {
    expect(
      validateCompetition(
        withInfo({ reg_begin_time: "2026.09.01 00:00", reg_end_time: "2026.09.10 23:59" }),
        [],
        1
      )
    ).toBeNull()
  })

  describe("开启审核时", () => {
    const info = withInfo({ is_review: 1 })

    it("必须填写默认审核者", () => {
      expect(validateCompetition(info, [{ key: 0, value: " " }], 1)?.field).toBe("default-reviewer")
    })

    it("整行留空的学院审核者会被忽略", () => {
      const rows: ReviewSetting[] = [
        { key: 0, value: "B21031234" },
        { key: -1, value: "" },
      ]
      expect(validateCompetition(info, rows, 2)).toBeNull()
    })

    it("填了学号没选学院、选了学院没填学号都要拦下", () => {
      expect(
        validateCompetition(
          info,
          [
            { key: 0, value: "B21031234" },
            { key: -1, value: "B21031235" },
          ],
          2
        )?.field
      ).toBe("reviewer-college-1")
      expect(
        validateCompetition(
          info,
          [
            { key: 0, value: "B21031234" },
            { key: 3, value: "" },
          ],
          2
        )?.field
      ).toBe("reviewer-code-1")
    })

    it("同一学院不能分配两位审核者", () => {
      const rows: ReviewSetting[] = [
        { key: 0, value: "B21031234" },
        { key: 3, value: "B21031235" },
        { key: 3, value: "B21031236" },
      ]
      expect(validateCompetition(info, rows, 3)).toEqual({
        field: "reviewer-college-2",
        message: "第 2 位学院审核者的负责学院与前面重复了",
      })
    })

    it("只校验当前显示的行数", () => {
      const rows: ReviewSetting[] = [
        { key: 0, value: "B21031234" },
        { key: -1, value: "B21031235" },
      ]
      expect(validateCompetition(info, rows, 1)).toBeNull()
    })
  })
})

describe("buildReviewSettings", () => {
  it("保留默认审核者，丢弃空行与占位学院代号", () => {
    const rows: ReviewSetting[] = [
      { key: 0, value: " B21031234 " },
      { key: 3, value: "B21031235" },
      { key: -1, value: "" },
      { key: 5, value: "" },
    ]
    expect(buildReviewSettings(rows, 4)).toEqual({ 0: "B21031234", 3: "B21031235" })
  })

  it("超出 reviewerNum 的行不提交", () => {
    const rows: ReviewSetting[] = [
      { key: 0, value: "B21031234" },
      { key: 3, value: "B21031235" },
    ]
    expect(buildReviewSettings(rows, 1)).toEqual({ 0: "B21031234" })
  })
})

describe("reviewSettingsFromApi", () => {
  it("默认审核者排在第一行", () => {
    expect(reviewSettingsFromApi({ "3": "B21031235", "0": "B21031234" })).toEqual([
      { key: 0, value: "B21031234" },
      { key: 3, value: "B21031235" },
    ])
  })

  it("没有默认审核者时补一行空的，只有默认审核者时补一行学院审核者", () => {
    expect(reviewSettingsFromApi({ "3": "B21031235" })[0]).toEqual({ key: 0, value: "" })
    expect(reviewSettingsFromApi({ "0": "B21031234" })).toEqual([
      { key: 0, value: "B21031234" },
      { key: -1, value: "" },
    ])
    expect(reviewSettingsFromApi(null)).toEqual([
      { key: 0, value: "" },
      { key: -1, value: "" },
    ])
  })
})
