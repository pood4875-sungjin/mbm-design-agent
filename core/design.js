// 생성 파일 — 직접 고치지 말 것. 원본: core/design/*.json, 빌드: node scripts/build-design.mjs
// 매체 11 · 예시 소재 131장 관찰 (Figma "컨시어지" 보드, 2026-09-28)
// 각 값의 {value,n,total}: 예시 total장 중 n장이 value였다. value=null 이면 기준 없음(관찰 부족·과반 미만) — 렌더러 기본 문법 사용.

export const DESIGN = {
  "blind": {
    "examples": 5,
    "nodeIds": [
      "421:8140",
      "421:8411",
      "421:8260",
      "421:8370",
      "421:8448"
    ],
    "mark": {
      "examples": 1,
      "background": {
        "value": null,
        "n": 1,
        "total": 1,
        "counts": {
          "solid": 1
        }
      },
      "bgColor": {
        "value": null,
        "n": 1,
        "total": 1,
        "counts": {
          "#FFFFFF": 1
        }
      },
      "logoTreatment": {
        "value": null,
        "n": 1,
        "total": 1,
        "counts": {
          "original-color": 1
        }
      },
      "logoSizeRatio": 0.875,
      "objectType": {
        "value": null,
        "n": 1,
        "total": 1,
        "counts": {
          "logo-only": 1
        }
      }
    },
    "background": {
      "value": null,
      "n": 2,
      "total": 5,
      "counts": {
        "solid": 1,
        "pattern": 2,
        "gradient": 2
      }
    },
    "bgLight": {
      "n": 2,
      "total": 5,
      "value": 0.4
    },
    "objectSide": {
      "value": "right",
      "n": 5,
      "total": 5,
      "counts": {
        "right": 5
      }
    },
    "objectType": {
      "value": "product",
      "n": 3,
      "total": 5,
      "counts": {
        "product": 3,
        "illustration": 2
      }
    },
    "objectWidthRatio": 0.316,
    "textAlign": {
      "value": "left",
      "n": 5,
      "total": 5,
      "counts": {
        "left": 5
      }
    },
    "textBlock": {
      "value": "left",
      "n": 5,
      "total": 5,
      "counts": {
        "left": 5
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.117,
    "mainWeight": {
      "value": "bold",
      "n": 3,
      "total": 5,
      "counts": {
        "bold": 3,
        "black": 2
      }
    },
    "subPresent": {
      "n": 5,
      "total": 5,
      "value": 1
    },
    "datePresent": {
      "n": 5,
      "total": 5,
      "value": 1
    },
    "logoPresent": {
      "n": 5,
      "total": 5,
      "value": 1
    },
    "logoPosition": {
      "value": "top-right",
      "n": 5,
      "total": 5,
      "counts": {
        "top-right": 5
      }
    },
    "logoTreatment": {
      "value": "original-color",
      "n": 3,
      "total": 5,
      "counts": {
        "original-color": 3,
        "white": 2
      }
    },
    "logoSizeRatio": 0.196,
    "badgePresent": {
      "n": 5,
      "total": 5,
      "value": 1
    },
    "badgeStyle": {
      "value": "pill",
      "n": 5,
      "total": 5,
      "counts": {
        "pill": 5
      }
    },
    "cta": {
      "value": null,
      "n": 0,
      "total": 5,
      "counts": {}
    },
    "whitespace": {
      "value": "balanced",
      "n": 5,
      "total": 5,
      "counts": {
        "balanced": 5
      }
    },
    "mainPx": 66,
    "byShape": {
      "strip": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "wide": {
        "examples": 5,
        "objectSide": {
          "value": "right",
          "n": 5,
          "total": 5,
          "counts": {
            "right": 5
          }
        },
        "objectWidthRatio": 0.316,
        "textAlign": {
          "value": "left",
          "n": 5,
          "total": 5,
          "counts": {
            "left": 5
          }
        },
        "mainLines": 2,
        "mainPx": 66,
        "logoPosition": {
          "value": "top-right",
          "n": 5,
          "total": 5,
          "counts": {
            "top-right": 5
          }
        }
      },
      "tall": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "box": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      }
    },
    "typical": "블라인드 소재는 브랜드 단색·그라데이션이나 연회색 웨이브 패턴 배경에 왼쪽 정렬 메인 2줄(≈180–190px 블록), 기간 pill, 모집분야 1줄(54px)을 쌓고, 오른쪽 25–41%에 제품 누끼나 아이소 일러스트를 둔다. 로고는 우상단 300×60 로고영역에 오른쪽으로 붙인다.",
    "rules": [
      "메인 카피는 항상 2줄이고 브랜드명·채용명으로 나눈다 (5/5). 피드 1200×628은 '메인 문구' 190px 블록(86+18+86)을 쓴다 (2/3, 대원은 166px 단일 박스). 띠배너 1250×560은 180px(80+20+80)이나 140px",
      "메인 글자 높이는 캔버스 높이의 ≈9–12%(피드 60–75px, 띠배너 50–65px) (5/5)",
      "메인 바로 아래에 기간 pill이 온다(흰색·네이비 채움 또는 흰 2px 아웃라인). 높이 57–76px, 안의 글자는 '상세 문구' 54px 라인 기준 (5/5)",
      "모집분야·모집직무는 54px 1줄이다. 라벨 bold + 값 regular 텍스트이거나 두 번째 아웃라인 pill (5/5)",
      "로고는 우상단 로고영역 300×60(가이드 x860–1160, y40–100) 안에 오른쪽으로 붙인다. 로고 오른쪽 끝 x≈1125–1150, 위쪽 y≈50–65 (5/5). 가로형 로고는 폭 17–20%, 세로로 두꺼운 로고(정식품)는 12.5%",
      "카피 시작 x: 피드 1200×628은 ≈50–62px(≈5%), 띠배너 1250×560은 70–142px(대원 126, 템플릿 142, HS 70). 띠배너 쪽이 더 안쪽이거나 같다 (3/3 쌍)",
      "오브젝트는 오른쪽, 폭 25–41% (5/5). 누끼 제품은 캔버스 안쪽(아래 끝 ≈여백선 510), 일러스트는 피드판에서만 오른쪽·아래 블리드 (1/2)",
      "배경 전체를 브랜드 원색으로 채우고 타이포를 흰색으로 쓰거나(3/5), 연회색 배경에 네이비 카피 + 브랜드명만 브랜드색으로 강조한다(2/5)",
      "같은 고객의 피드→띠배너 변환: 에셋·색·요소 순서는 그대로 두고 카피 시작 x를 옮기며 메인을 줄인다(대원 60→50px, HS 74→65px). pill 높이도 76→57(대원), 72→67(HS) (2/2)",
      "CTA 버튼이 없다 (6/6). 템플릿 숨김 레이어의 '채용 공고 확인하기 ▶▶'는 쓰지 않는 구버전",
      "로고 96×96: 흰 배경 가운데, 폭 ≈88%, 원형 크롭 안전영역 안 (1/1, 가이드 421:8256)"
    ]
  },
  "catch": {
    "examples": 8,
    "nodeIds": [
      "423:8536",
      "423:8546",
      "423:8556",
      "423:8564",
      "423:8595",
      "423:8608",
      "423:8644",
      "423:8520"
    ],
    "mark": {
      "examples": 0,
      "background": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "bgColor": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoTreatment": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoSizeRatio": null,
      "objectType": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      }
    },
    "background": {
      "value": "solid",
      "n": 8,
      "total": 8,
      "counts": {
        "solid": 8
      }
    },
    "bgLight": {
      "n": 3,
      "total": 8,
      "value": 0.375
    },
    "objectSide": {
      "value": "right",
      "n": 8,
      "total": 8,
      "counts": {
        "right": 8
      }
    },
    "objectType": {
      "value": "illustration",
      "n": 8,
      "total": 8,
      "counts": {
        "illustration": 8
      }
    },
    "objectWidthRatio": 0.3,
    "textAlign": {
      "value": "left",
      "n": 8,
      "total": 8,
      "counts": {
        "left": 8
      }
    },
    "textBlock": {
      "value": "left",
      "n": 8,
      "total": 8,
      "counts": {
        "left": 8
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.1,
    "mainWeight": {
      "value": "bold",
      "n": 8,
      "total": 8,
      "counts": {
        "bold": 8
      }
    },
    "subPresent": {
      "n": 8,
      "total": 8,
      "value": 1
    },
    "datePresent": {
      "n": 7,
      "total": 8,
      "value": 0.875
    },
    "logoPresent": {
      "n": 4,
      "total": 8,
      "value": 0.5
    },
    "logoPosition": {
      "value": "bottom-right",
      "n": 4,
      "total": 4,
      "counts": {
        "bottom-right": 4
      }
    },
    "logoTreatment": {
      "value": "original-color",
      "n": 4,
      "total": 4,
      "counts": {
        "original-color": 4
      }
    },
    "logoSizeRatio": 0.26,
    "badgePresent": {
      "n": 0,
      "total": 8,
      "value": 0
    },
    "badgeStyle": {
      "value": null,
      "n": 0,
      "total": 0,
      "counts": {}
    },
    "cta": {
      "value": null,
      "n": 0,
      "total": 8,
      "counts": {}
    },
    "whitespace": {
      "value": "airy",
      "n": 4,
      "total": 8,
      "counts": {
        "airy": 4,
        "balanced": 4
      }
    },
    "mainPx": 32,
    "byShape": {
      "strip": {
        "examples": 4,
        "objectSide": {
          "value": "right",
          "n": 4,
          "total": 4,
          "counts": {
            "right": 4
          }
        },
        "objectWidthRatio": 0.3,
        "textAlign": {
          "value": "left",
          "n": 4,
          "total": 4,
          "counts": {
            "left": 4
          }
        },
        "mainLines": 1,
        "mainPx": 32,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "wide": {
        "examples": 3,
        "objectSide": {
          "value": "right",
          "n": 3,
          "total": 3,
          "counts": {
            "right": 3
          }
        },
        "objectWidthRatio": 0.42,
        "textAlign": {
          "value": "left",
          "n": 3,
          "total": 3,
          "counts": {
            "left": 3
          }
        },
        "mainLines": 2,
        "mainPx": 42,
        "logoPosition": {
          "value": "bottom-right",
          "n": 3,
          "total": 3,
          "counts": {
            "bottom-right": 3
          }
        }
      },
      "tall": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "box": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      }
    },
    "typical": "캐치 중앙배너는 대체로 단색 배경(흰·검정·이미지에서 뽑은 색) 위에 왼쪽 정렬 3단 텍스트(서브 슬로건 → 굵은 메인 → 날짜·키워드), 오른쪽 이미지 영역에 둥근 모서리 썸네일, PC는 로고 없이 하단 60px 비움, MO는 메인 2줄 + 우하단 원형 로고",
    "rules": [
      "배경은 그라데이션 없이 단색 하나이고, 변형은 배경색만 바꿔 만든다(8/8 단색, PTKOREA 7장 동일 배치)",
      "텍스트 색은 배경 명도에 따라 검정 또는 흰색 둘 중 하나만 쓴다(7/7 PTKOREA, 가이드 명시)",
      "텍스트는 왼쪽 정렬 3단: 서브 20자 미만 → 메인 17자 미만 → 날짜/키워드 30자 미만(8/8 3단 구성)",
      "PC 메인은 1줄(4/4), MO 메인은 2줄로 나눈다(4/4)",
      "이미지는 오른쪽에 두며 PC는 515×315 영역 안 가운데에 둥근 썸네일(폭 약 30%), MO는 폭 약 42%(8/8 오른쪽)",
      "PC는 하단 60px 비노출 영역에 아무것도 두지 않는다(4/4)",
      "로고는 PC에는 넣지 않고(4/4), MO에서만 우하단 160px 원형 로고 영역에 둔다(4/4)",
      "이미지 파일에는 텍스트를 넣지 않는다 — 텍스트는 앱이 웹폰트로 얹는다(가이드)",
      "배지·CTA 버튼은 쓰지 않는다(8/8)",
      "MO에서는 메인 텍스트가 썸네일 왼쪽 가장자리를 덮어도 허용된다(3/3 PTKOREA MO)"
    ]
  },
  "everytime": {
    "examples": 8,
    "nodeIds": [
      "421:7623",
      "421:7639",
      "421:7653",
      "421:7670",
      "421:8104",
      "421:8119",
      "421:7691",
      "421:8061"
    ],
    "mark": {
      "examples": 2,
      "background": {
        "value": "solid",
        "n": 2,
        "total": 2,
        "counts": {
          "solid": 2
        }
      },
      "bgColor": {
        "value": "#FFFFFF",
        "n": 2,
        "total": 2,
        "counts": {
          "#FFFFFF": 2
        }
      },
      "logoTreatment": {
        "value": "original-color",
        "n": 2,
        "total": 2,
        "counts": {
          "original-color": 2
        }
      },
      "logoSizeRatio": 0.88,
      "objectType": {
        "value": "logo-only",
        "n": 2,
        "total": 2,
        "counts": {
          "logo-only": 2
        }
      }
    },
    "background": {
      "value": "transparent",
      "n": 4,
      "total": 8,
      "counts": {
        "transparent": 4,
        "solid": 3,
        "gradient": 1
      }
    },
    "bgLight": {
      "n": 0,
      "total": 4,
      "value": 0
    },
    "objectSide": {
      "value": "right",
      "n": 7,
      "total": 8,
      "counts": {
        "right": 7,
        "left": 1
      }
    },
    "objectType": {
      "value": "illustration",
      "n": 5,
      "total": 8,
      "counts": {
        "illustration": 5,
        "product": 2,
        "building": 1
      }
    },
    "objectWidthRatio": 0.3,
    "textAlign": {
      "value": "left",
      "n": 8,
      "total": 8,
      "counts": {
        "left": 8
      }
    },
    "textBlock": {
      "value": "left",
      "n": 7,
      "total": 8,
      "counts": {
        "left": 7,
        "right": 1
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.14,
    "mainWeight": {
      "value": "bold",
      "n": 6,
      "total": 8,
      "counts": {
        "black": 2,
        "bold": 6
      }
    },
    "subPresent": {
      "n": 8,
      "total": 8,
      "value": 1
    },
    "datePresent": {
      "n": 5,
      "total": 8,
      "value": 0.625
    },
    "logoPresent": {
      "n": 4,
      "total": 8,
      "value": 0.5
    },
    "logoPosition": {
      "value": "top-right",
      "n": 2,
      "total": 4,
      "counts": {
        "top-left": 1,
        "right": 1,
        "top-right": 2
      }
    },
    "logoTreatment": {
      "value": "white",
      "n": 3,
      "total": 4,
      "counts": {
        "original-color": 1,
        "white": 3
      }
    },
    "logoSizeRatio": 0.11,
    "badgePresent": {
      "n": 1,
      "total": 8,
      "value": 0.125
    },
    "badgeStyle": {
      "value": null,
      "n": 1,
      "total": 1,
      "counts": {
        "pill": 1
      }
    },
    "cta": {
      "value": null,
      "n": 2,
      "total": 8,
      "counts": {
        "text": 2,
        "button": 1
      }
    },
    "whitespace": {
      "value": "balanced",
      "n": 6,
      "total": 8,
      "counts": {
        "airy": 2,
        "balanced": 6
      }
    },
    "mainPx": 42,
    "byShape": {
      "strip": {
        "examples": 4,
        "objectSide": {
          "value": "right",
          "n": 4,
          "total": 4,
          "counts": {
            "right": 4
          }
        },
        "objectWidthRatio": 0.24,
        "textAlign": {
          "value": "left",
          "n": 4,
          "total": 4,
          "counts": {
            "left": 4
          }
        },
        "mainLines": 3,
        "mainPx": 43,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "wide": {
        "examples": 2,
        "objectSide": {
          "value": null,
          "n": 1,
          "total": 2,
          "counts": {
            "left": 1,
            "right": 1
          }
        },
        "objectWidthRatio": 0.33,
        "textAlign": {
          "value": "left",
          "n": 2,
          "total": 2,
          "counts": {
            "left": 2
          }
        },
        "mainLines": 3,
        "mainPx": 28,
        "logoPosition": {
          "value": null,
          "n": 1,
          "total": 2,
          "counts": {
            "top-left": 1,
            "right": 1
          }
        }
      },
      "tall": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "box": {
        "examples": 2,
        "objectSide": {
          "value": "right",
          "n": 2,
          "total": 2,
          "counts": {
            "right": 2
          }
        },
        "objectWidthRatio": 0.58,
        "textAlign": {
          "value": "left",
          "n": 2,
          "total": 2,
          "counts": {
            "left": 2
          }
        },
        "mainLines": 2,
        "mainPx": 48,
        "logoPosition": {
          "value": "top-right",
          "n": 2,
          "total": 2,
          "counts": {
            "top-right": 2
          }
        }
      }
    },
    "typical": "커뮤니티보드는 투명 배경에 왼쪽 좌측정렬 텍스트 2~3줄(1줄=사명 포함 볼드 45px, 아래로 35/25px로 작아지고 가벼워짐) + 오른쪽 누끼 3D 일러스트·제품 오브젝트(너비 ≈250px, 로고 없이 카피로 광고주 표기)이고, 홈 배너·홈 카드는 브랜드 단색/그라데이션 배경 위 같은 좌-텍스트/우-오브젝트 구성에 로고를 별도로 둔다",
    "rules": [
      "텍스트는 오브젝트 반대편에 블록으로 두고 블록 안은 항상 좌측정렬 (8/8, 프로필 제외). 오브젝트는 오른쪽이 기본 (7/8), 왼쪽은 맥도날드 홈배너 1건",
      "커뮤니티보드 텍스트 높이는 '글자 실측 높이'로 45/35/25px를 맞춘다: DN솔루션즈 43/31/25는 통과, 대원제약 35/27은 '텍스트 높이' 반려 → 42/32로 키워 수정 (반려 사례 1/1)",
      "줄마다 한 단계씩 작고 가볍게: 1줄 볼드(사명·핵심 카피) → 2줄 세미볼드/레귤러 → 3줄 레귤러 (8/8)",
      "커뮤니티보드는 배경 도형 없이 투명, 광고주 표기는 별도 로고 대신 카피 1줄의 사명(+오브젝트 속 로고)으로 (4/4)",
      "홈 배너·홈 카드는 브랜드 컬러 전면 단색/그라데이션 배경 + 로고 별도 배치 (4/4: 홈카드는 우상단 2/2)",
      "기타문구는 2줄형에만 붙는다 (2/2: 대원 '서류 지원하기 >', 맥도날드 '지금 지원하세요!' pill), 3줄형엔 없다 (3/3)",
      "텍스트 색은 1~2색 + 브랜드 액센트 한 가지로 제한 (8/8, 규정 최대 3색)",
      "오브젝트는 사진이 아닌 누끼형 3D/아이소메트릭 일러스트·제품·캐릭터 (8/8, 실사 0). 커뮤니티보드 오브젝트 폭 ≈250px(0.24) — 배경 포함형은 카드로 감싼 V2 1건",
      "홈 카드는 좌상단 텍스트 블록(좌측 여백 50–86px) + 우하단 큰 오브젝트(폭 0.3–0.6) + 우상단 흰 로고 (2/2, 템플릿 7605와 동일)",
      "홈 카드 프로필 160×160은 흰 배경 + 로고 단독 중앙 (2/2)"
    ]
  },
  "google-gdn": {
    "examples": 28,
    "nodeIds": [
      "414:1927",
      "414:1963",
      "414:1996",
      "414:1894",
      "414:2056",
      "414:2066",
      "414:2076",
      "414:2045",
      "414:2100",
      "414:2117",
      "414:2134",
      "414:2087",
      "414:2153",
      "414:2190",
      "414:2208",
      "414:2171",
      "6:490",
      "6:487",
      "6:488",
      "6:489",
      "9:726",
      "9:685",
      "9:707",
      "9:746",
      "418:2461",
      "418:2203",
      "418:2331",
      "418:2595"
    ],
    "mark": {
      "examples": 0,
      "background": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "bgColor": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoTreatment": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoSizeRatio": null,
      "objectType": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      }
    },
    "background": {
      "value": "solid",
      "n": 16,
      "total": 28,
      "counts": {
        "solid": 16,
        "gradient": 12
      }
    },
    "bgLight": {
      "n": 12,
      "total": 28,
      "value": 0.42857142857142855
    },
    "objectSide": {
      "value": "right",
      "n": 18,
      "total": 28,
      "counts": {
        "right": 18,
        "full-bleed": 7,
        "center": 3
      }
    },
    "objectType": {
      "value": "illustration",
      "n": 20,
      "total": 28,
      "counts": {
        "building": 4,
        "illustration": 20,
        "people-photo": 4
      }
    },
    "objectWidthRatio": 0.55,
    "textAlign": {
      "value": "left",
      "n": 22,
      "total": 28,
      "counts": {
        "left": 22,
        "center": 6
      }
    },
    "textBlock": {
      "value": "left",
      "n": 22,
      "total": 28,
      "counts": {
        "left": 22,
        "center": 6
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.08,
    "mainWeight": {
      "value": "bold",
      "n": 20,
      "total": 28,
      "counts": {
        "bold": 20,
        "black": 8
      }
    },
    "subPresent": {
      "n": 24,
      "total": 28,
      "value": 0.8571428571428571
    },
    "datePresent": {
      "n": 28,
      "total": 28,
      "value": 1
    },
    "logoPresent": {
      "n": 28,
      "total": 28,
      "value": 1
    },
    "logoPosition": {
      "value": "top-right",
      "n": 16,
      "total": 28,
      "counts": {
        "top-right": 16,
        "top-center": 5,
        "top-left + top-right": 5,
        "inline-with-copy": 2
      }
    },
    "logoTreatment": {
      "value": "original-color",
      "n": 20,
      "total": 28,
      "counts": {
        "original-color": 20,
        "white": 8
      }
    },
    "logoSizeRatio": 0.25,
    "badgePresent": {
      "n": 24,
      "total": 28,
      "value": 0.8571428571428571
    },
    "badgeStyle": {
      "value": "pill",
      "n": 16,
      "total": 24,
      "counts": {
        "pill": 16,
        "tag": 8
      }
    },
    "cta": {
      "value": null,
      "n": 4,
      "total": 28,
      "counts": {
        "button": 4
      }
    },
    "whitespace": {
      "value": "balanced",
      "n": 19,
      "total": 28,
      "counts": {
        "balanced": 19,
        "tight": 6,
        "airy": 3
      }
    },
    "mainPx": 32,
    "byShape": {
      "strip": {
        "examples": 10,
        "objectSide": {
          "value": "right",
          "n": 10,
          "total": 10,
          "counts": {
            "right": 10
          }
        },
        "objectWidthRatio": 0.33,
        "textAlign": {
          "value": "left",
          "n": 10,
          "total": 10,
          "counts": {
            "left": 10
          }
        },
        "mainLines": 2,
        "mainPx": 32,
        "logoPosition": {
          "value": "top-right",
          "n": 8,
          "total": 10,
          "counts": {
            "top-right": 8,
            "top-left + top-right": 2
          }
        }
      },
      "wide": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "tall": {
        "examples": 11,
        "objectSide": {
          "value": "full-bleed",
          "n": 7,
          "total": 11,
          "counts": {
            "right": 2,
            "full-bleed": 7,
            "center": 2
          }
        },
        "objectWidthRatio": 0.95,
        "textAlign": {
          "value": "center",
          "n": 6,
          "total": 11,
          "counts": {
            "left": 5,
            "center": 6
          }
        },
        "mainLines": 3,
        "mainPx": 32,
        "logoPosition": {
          "value": null,
          "n": 5,
          "total": 11,
          "counts": {
            "top-right": 3,
            "top-center": 5,
            "inline-with-copy": 2,
            "top-left + top-right": 1
          }
        }
      },
      "box": {
        "examples": 7,
        "objectSide": {
          "value": "right",
          "n": 6,
          "total": 7,
          "counts": {
            "right": 6,
            "center": 1
          }
        },
        "objectWidthRatio": 0.5,
        "textAlign": {
          "value": "left",
          "n": 7,
          "total": 7,
          "counts": {
            "left": 7
          }
        },
        "mainLines": 2,
        "mainPx": 32,
        "logoPosition": {
          "value": "top-right",
          "n": 5,
          "total": 7,
          "counts": {
            "top-right": 5,
            "top-left + top-right": 2
          }
        }
      }
    },
    "typical": "GDN 소재는 대체로 흰색/브랜드 단색 또는 그라데이션 배경 위에 왼쪽 정렬 카피 스택(아이브로 1줄 + 메인 2줄 + 날짜 pill/태그 + 모집분야 라벨·목록)을 두고, 가로형은 오른쪽 30~60%에, 세로형은 하단 25~40%에 3D 아이소메트릭 일러스트(또는 건물·인물 사진)를 배치하며 로고는 우상단 — 한 캠페인을 5개 비율로 재배치할 뿐 정보는 빼지 않는다.",
    "rules": [
      "가로형(580×400·970×250·930×180)은 예외 없이 카피 왼쪽 정렬·왼쪽 블록(17/17). 세로형(300×600·300×1050)만 중앙 정렬로 바뀔 수 있다(중앙 6/11, 왼쪽 유지 5/11). 300×1050은 항상 같은 고객사 300×600과 같은 정렬(4/4).",
      "580×400: 카피 왼쪽 55~60% 열에 [아이브로 1줄] + 메인 2줄(6/7) + 날짜 박스 + 라벨·목록 ≤2줄. 오브젝트는 우측/우하단 0.3~0.6W이고 오른쪽·아래 모서리로 넘치게 둠(6/7). 캐릭터 여러 개처럼 가로로 긴 오브젝트만 하단 전폭 띠로 배치(1/7).",
      "970×250: 오브젝트를 오른쪽 28~38%W에 두고 위·아래로 넘치게 크롭(7/7). 카피는 왼쪽 약 60% 열에 메인 1~2줄(glyph 0.12~0.15H, 한 줄에 들어가면 1줄로 합침 3/7). 580에서 세로로 쌓던 날짜·모집분야는 가로로 풂 — 라벨+값 한 행, 목록 쉼표 1줄, 가운데 열로 이동, 또는 메인 옆 빈 칸으로 이동(목록이 있는 6/6). 930×180은 이 배치를 세로로 압축(3/3): 메인 1~2줄(0.13~0.18H), 오브젝트 0.19~0.35W, 로고 0.07~0.13W, 정보는 빼지 않고 여백만 줄임.",
      "300×600: 로고→[아이브로]→메인→날짜→목록→오브젝트 순 세로 스택. 오브젝트는 하단 23~43%H(중앙값 약 33%)에 0.9~1.1W로 전폭 배치, 인물·건물 사진이면 우하단 0.55~0.65W(7/7). 메인은 2~4줄로 재개행. 목록은 580의 2~3줄 유지(4/6) 또는 세로 행으로 전환(2/6).",
      "300×1050: 300×600 스택을 유지하고 간격만 늘림. 카피가 상단 60~70%, 오브젝트 하단 20~38%. 남는 높이는 행간·블록 간격, 상단 여백(안랩 15%), 하단 브랜드색 빈 지면(동부 15%, ABL 12%)으로 흡수(4/4). 메인은 한 단어씩 최대 4줄, 아이브로 2줄(3/4), 목록은 세로 행·불릿으로(3/4).",
      "메인 카피 글자 높이는 규격과 상관없이 절대값 약 24~40px로 거의 같다(28/28). 비율(×H)로 키우지 말고 px를 고정한 뒤, 텍스트 열 폭 70~90%를 채우도록 줄바꿈으로 맞춘다. 그래서 mainSizeRatio는 930×180에서 0.13~0.18, 300×1050에서 0.03~0.04로 크게 벌어진다.",
      "로고: 가로형은 우상단 13/17, 좌상+우상 분리 4/17(한국 이중 로고 3, ABL 580 그룹 로고 1). 세로형에서 중앙 정렬로 바꾸면 로고도 상단 중앙으로 모음(5/6, 한국만 모서리 유지). 왼쪽 정렬을 유지하면 우상단 유지(3/5) 또는 워드마크를 헤드라인 줄로 흡수(안랩 2/5). 로고 폭은 가로형 단일 로고 0.07~0.16W, 300폭에서 0.22~0.7W.",
      "정보는 규격이 작아져도 줄이지 않는다. 날짜 28/28, 모집분야 목록은 목록이 있는 6개 고객사에서 24/24 전 규격에 남음. 대신 한 줄로 합치거나(970·930) 세로로 풀어(300폭) 다시 배치한다. 구글은 텍스트량 제한이 없어 정보 밀도가 높다.",
      "오브젝트와 브랜드 장치는 전 규격에서 같은 에셋을 크롭·스케일만 바꿔 재사용(7/7). 하단 브랜드 띠가 있는 고객사는 모든 규격에서 띠 유지(12/12, 높이 6~17%H로 낮은 캔버스일수록 비중 증가). 테두리 프레임(일화 레드 인셋, 동부 네이비 프레임+흰 카드)도 전 규격 유지.",
      "날짜는 장식해서 보여줌(24/28): 날짜 자체를 pill·태그·붓 하이라이트로 감싸거나(비씨·동부·ABL·동서 16/28), '접수기간/모집기간' 라벨 pill·태그를 앞에 붙임(일화·안랩 8/28). 평문 날짜는 한국앤컴퍼니 4/28뿐. 강조색은 한 가지만 쓰고(7/7) 브랜드색은 풀배경(ABL·안랩) 또는 강조어·박스·띠(5곳) 중 하나로 쓴다. 좌측 텍스트 여백은 가로형 약 28~38px, 300폭 약 20~30px. CTA 버튼은 드묾(4/28, 한국앤컴퍼니 'Click!' pill)."
    ]
  },
  "instagram": {
    "examples": 18,
    "nodeIds": [
      "421:3273",
      "421:3292",
      "421:4519",
      "421:4589",
      "421:4667",
      "421:3333",
      "421:3132",
      "421:3138",
      "421:3139",
      "421:3144",
      "421:3145",
      "421:3146",
      "421:3265",
      "421:3266",
      "421:5335",
      "421:5264",
      "421:5304",
      "421:5286"
    ],
    "mark": {
      "examples": 0,
      "background": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "bgColor": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoTreatment": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoSizeRatio": null,
      "objectType": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      }
    },
    "background": {
      "value": null,
      "n": 7,
      "total": 18,
      "counts": {
        "gradient": 7,
        "solid": 5,
        "photo": 5,
        "pattern": 1
      }
    },
    "bgLight": {
      "n": 4,
      "total": 18,
      "value": 0.2222222222222222
    },
    "objectSide": {
      "value": null,
      "n": 6,
      "total": 18,
      "counts": {
        "center": 4,
        "full-bleed": 4,
        "right": 6
      }
    },
    "objectType": {
      "value": "illustration",
      "n": 9,
      "total": 18,
      "counts": {
        "illustration": 9,
        "building": 4,
        "product": 1
      }
    },
    "objectWidthRatio": 0.6,
    "textAlign": {
      "value": "left",
      "n": 13,
      "total": 18,
      "counts": {
        "center": 5,
        "left": 13
      }
    },
    "textBlock": {
      "value": "left",
      "n": 13,
      "total": 18,
      "counts": {
        "center": 5,
        "left": 13
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.072,
    "mainWeight": {
      "value": "bold",
      "n": 15,
      "total": 18,
      "counts": {
        "black": 3,
        "bold": 15
      }
    },
    "subPresent": {
      "n": 12,
      "total": 18,
      "value": 0.6666666666666666
    },
    "datePresent": {
      "n": 17,
      "total": 18,
      "value": 0.9444444444444444
    },
    "logoPresent": {
      "n": 18,
      "total": 18,
      "value": 1
    },
    "logoPosition": {
      "value": null,
      "n": 8,
      "total": 18,
      "counts": {
        "top-right": 8,
        "bottom-left": 4,
        "top-center": 2,
        "bottom-right": 1,
        "top-left": 1,
        "bottom-center": 2
      }
    },
    "logoTreatment": {
      "value": "white",
      "n": 11,
      "total": 18,
      "counts": {
        "original-color": 7,
        "white": 11
      }
    },
    "logoSizeRatio": 0.21,
    "badgePresent": {
      "n": 10,
      "total": 18,
      "value": 0.5555555555555556
    },
    "badgeStyle": {
      "value": "tag",
      "n": 6,
      "total": 10,
      "counts": {
        "pill": 4,
        "tag": 6
      }
    },
    "cta": {
      "value": null,
      "n": 1,
      "total": 18,
      "counts": {
        "button": 1
      }
    },
    "whitespace": {
      "value": "balanced",
      "n": 11,
      "total": 18,
      "counts": {
        "balanced": 11,
        "tight": 2,
        "airy": 5
      }
    },
    "mainPx": 81,
    "byShape": {
      "strip": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "wide": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "tall": {
        "examples": 1,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 1,
          "counts": {}
        },
        "objectWidthRatio": 0,
        "textAlign": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "left": 1
          }
        },
        "mainLines": 2,
        "mainPx": 96,
        "logoPosition": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "bottom-right": 1
          }
        }
      },
      "box": {
        "examples": 17,
        "objectSide": {
          "value": null,
          "n": 6,
          "total": 17,
          "counts": {
            "center": 4,
            "full-bleed": 4,
            "right": 6
          }
        },
        "objectWidthRatio": 0.6,
        "textAlign": {
          "value": "left",
          "n": 12,
          "total": 17,
          "counts": {
            "center": 5,
            "left": 12
          }
        },
        "mainLines": 2,
        "mainPx": 78,
        "logoPosition": {
          "value": null,
          "n": 8,
          "total": 17,
          "counts": {
            "top-right": 8,
            "bottom-left": 4,
            "top-center": 2,
            "top-left": 1,
            "bottom-center": 2
          }
        }
      }
    },
    "typical": "브랜드 컬러 단색·그라데이션(또는 어두운 사진) 배경 위에 상단 좌측정렬 메인 카피 2줄 + 시즌 서브 + 날짜를 두고, 하단 약 45%에 일러스트·3D·건물 사진 오브젝트(가운데 전폭 또는 우하단), 로고는 우상단(중앙정렬형이면 상단/하단 중앙) — 이미지가 없으면 타이포+컬러 블록, 전면 추상 이미지, 업종 상징 3D 오브젝트 중 하나로 대체",
    "rules": [
      "상단 텍스트 / 하단 비주얼 2단 구조: 오브젝트가 있는 소재는 모두 하단(가운데·전폭·우하단)에 오브젝트를 둔다 (14/14), 텍스트 블록은 상단에서 시작한다 (17/17 피드). 템플릿 기준 하단 이미지 영역은 1080×495(캔버스의 46%) (3/3 수급 가능 템플릿)",
      "좌측정렬이 기본이다 (13/18), 중앙정렬은 5/18. 중앙정렬이면 로고도 중앙축(상단 중앙 또는 하단 중앙)에 둔다 (4/5)",
      "메인 카피는 2줄 (14/18), 많아도 3줄 (4/18). 메인 글자 실측 높이는 캔버스의 6.7–9% (17/17 피드)",
      "모집 기간(날짜)은 거의 항상 넣는다 (17/18 — 없는 건 동우화인켐 4589뿐). 사각 박스·pill로 감싸는 경우 5/17, 나머지는 텍스트+대시/선 연결",
      "로고: 좌측정렬이면 우상단 (7/13) 또는 이미지 위 좌하단 흰색 (4/13). 전체로 흰색 처리 11/18, 원색 7/18. 로고 폭은 캔버스의 13–35% (피드 17장)",
      "배경은 브랜드 컬러 단색·그라데이션이 다수 (12/18), 실사·추상 사진 5/18, 패턴 1/18. 텍스트는 흰색 12/18, 밝은 배경일 때만 브랜드 다크색 6/18",
      "강조는 색 한 가지로: 메인 카피 안 사명/연도만 브랜드 액센트 색 (4/18: 호반·무라타·동부·바이오노트), 또는 줄 사이 굵기 대비 1줄 볼드/다음 줄 레귤러 (5/18)",
      "CTA 버튼은 거의 쓰지 않는다 (17/18 none — 바이오노트의 원형 화살표 1건)",
      "이미지·일러스트 수급이 어려우면 보드 가이드의 세 방식 중 하나로 대체: ❶ 타이포+지오메트릭 컬러 블록, ❷ 라이선스 추상 이미지 전면 + 중앙정렬, ❸ 업종 상징 3D 오브젝트 우하단 (관찰 4/4)",
      "스토리(1080×1920)는 상단 ~20%와 하단 ~19%(링크 스티커 pill 포함)를 UI 가림 영역으로 비우고, 텍스트·로고는 19.6–81% 안전영역 안에 둔다 (1/1)"
    ]
  },
  "jasoseol": {
    "examples": 13,
    "nodeIds": [
      "408:37780",
      "408:38102",
      "408:37952",
      "408:38167",
      "408:38305",
      "408:38424",
      "408:38560",
      "408:38710",
      "408:37986",
      "418:1992",
      "408:38216",
      "408:37971",
      "408:38739"
    ],
    "mark": {
      "examples": 0,
      "background": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "bgColor": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoTreatment": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoSizeRatio": null,
      "objectType": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      }
    },
    "background": {
      "value": "solid",
      "n": 9,
      "total": 13,
      "counts": {
        "gradient": 4,
        "solid": 9
      }
    },
    "bgLight": {
      "n": 9,
      "total": 13,
      "value": 0.6923076923076923
    },
    "objectSide": {
      "value": "bottom",
      "n": 10,
      "total": 13,
      "counts": {
        "left": 1,
        "right": 2,
        "bottom": 10
      }
    },
    "objectType": {
      "value": "illustration",
      "n": 12,
      "total": 13,
      "counts": {
        "illustration": 12,
        "building": 1
      }
    },
    "objectWidthRatio": 1,
    "textAlign": {
      "value": "left",
      "n": 13,
      "total": 13,
      "counts": {
        "left": 13
      }
    },
    "textBlock": {
      "value": "left",
      "n": 12,
      "total": 13,
      "counts": {
        "center": 1,
        "left": 12
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.05,
    "mainWeight": {
      "value": "bold",
      "n": 13,
      "total": 13,
      "counts": {
        "bold": 13
      }
    },
    "subPresent": {
      "n": 11,
      "total": 13,
      "value": 0.8461538461538461
    },
    "datePresent": {
      "n": 13,
      "total": 13,
      "value": 1
    },
    "logoPresent": {
      "n": 10,
      "total": 13,
      "value": 0.7692307692307693
    },
    "logoPosition": {
      "value": "top-center",
      "n": 6,
      "total": 10,
      "counts": {
        "top-right": 4,
        "top-center": 6
      }
    },
    "logoTreatment": {
      "value": "original-color",
      "n": 7,
      "total": 10,
      "counts": {
        "original-color": 7,
        "white": 3
      }
    },
    "logoSizeRatio": 0.39,
    "badgePresent": {
      "n": 0,
      "total": 13,
      "value": 0
    },
    "badgeStyle": {
      "value": null,
      "n": 0,
      "total": 0,
      "counts": {}
    },
    "cta": {
      "value": null,
      "n": 0,
      "total": 13,
      "counts": {}
    },
    "whitespace": {
      "value": "balanced",
      "n": 9,
      "total": 13,
      "counts": {
        "airy": 3,
        "balanced": 9,
        "tight": 1
      }
    },
    "mainPx": 32,
    "byShape": {
      "strip": {
        "examples": 1,
        "objectSide": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "left": 1
          }
        },
        "objectWidthRatio": 0.31,
        "textAlign": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "left": 1
          }
        },
        "mainLines": 2,
        "mainPx": 32,
        "logoPosition": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "top-right": 1
          }
        }
      },
      "wide": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "tall": {
        "examples": 6,
        "objectSide": {
          "value": "bottom",
          "n": 6,
          "total": 6,
          "counts": {
            "bottom": 6
          }
        },
        "objectWidthRatio": 1,
        "textAlign": {
          "value": "left",
          "n": 6,
          "total": 6,
          "counts": {
            "left": 6
          }
        },
        "mainLines": 3,
        "mainPx": 24,
        "logoPosition": {
          "value": "top-center",
          "n": 6,
          "total": 6,
          "counts": {
            "top-center": 6
          }
        }
      },
      "box": {
        "examples": 6,
        "objectSide": {
          "value": "bottom",
          "n": 4,
          "total": 6,
          "counts": {
            "right": 2,
            "bottom": 4
          }
        },
        "objectWidthRatio": 0.77,
        "textAlign": {
          "value": "left",
          "n": 6,
          "total": 6,
          "counts": {
            "left": 6
          }
        },
        "mainLines": 2,
        "mainPx": 40,
        "logoPosition": {
          "value": "top-right",
          "n": 3,
          "total": 3,
          "counts": {
            "top-right": 3
          }
        }
      }
    },
    "typical": "자소설닷컴 소재는 대체로 흰색·아이보리·파스텔 단색(또는 옅은 그라데이션) 배경 위에 Pretendard 좌측 정렬로 서브(연도) → 메인 Bold 2~4줄 → '라벨 : 값' 상세 줄을 쌓고, 세로형은 하단 이미지 영역에 3D·아이소메트릭 일러스트를 전폭으로, 로고 1개는 상단(세로형 중앙·가로형 우측)에 둔다 — 배지·버튼·장식은 없다",
    "rules": [
      "텍스트는 전부 좌측 정렬이고 순서는 서브(연도/회사) → 메인 → 일정 → 직무/상세로 고정 (13/13; 달력배너는 메인+마감일만 2/2)",
      "메인 카피는 Pretendard Bold, 상세는 라벨 Bold + 값 Regular (13/13, 408:38167 design context 확인). 서브는 PC메인배너만 Medium",
      "배경은 단색 또는 옅은 그라데이션뿐, 사진·패턴 배경 없음 (13/13) — 이미지는 가이드의 이미지 영역 안에만 들어감",
      "세로형 규격(160×600·600×880·328×466)은 이미지가 텍스트 아래 하단 영역에 가로 전폭(폭 비율 0.6~1.0)으로 들어감 (10/10); 가로형은 PC팝업·M메인이 우측(2/2), PC메인이 좌측(1/1)",
      "로고는 1개 — PC채용공고배너는 상단 중앙(6/6), PC메인·PC팝업·M팝업은 우상단(4/4), M메인·PC달력배너는 로고 없음(3/3, 규정)",
      "어두운/채도 높은 배경에서는 텍스트·로고를 흰색으로 반전 (텍스트 4/4, 로고 3/3), 밝은 배경에서는 로고 원색(7/7)·텍스트 검정 또는 진회색(8/9)",
      "브랜드 컬러를 텍스트에 쓰는 경우는 드묾 (1/13, 한미글로벌) — 브랜드색은 주로 배경 단색(모비스 네이비·한독 블루·도레이 틸)이나 일러스트로 표현 (3/13 배경, 5/13 일러스트 안에 로고·심볼 재노출)",
      "배지·태그·CTA 버튼은 없음 (13/13) — 규정상 가이드 영역 밖 요소 추가 불가",
      "160×600에서는 긴 회사명·괄호를 줄바꿈해 메인이 3~4줄이 되는 경우가 많음 (4/6), 메인 크기는 24px(높이 대비 0.04)로 고정",
      "같은 고객사 세트(현대케피코 3종, 세아제강 3종)는 배경색·일러스트·텍스트색을 규격 간 그대로 재사용 (6/6), 규격별로 바뀌는 것은 줄바꿈과 로고 유무뿐"
    ]
  },
  "jobda": {
    "examples": 19,
    "nodeIds": [
      "414:322",
      "414:323",
      "414:324",
      "414:475",
      "414:486",
      "414:519",
      "414:531",
      "414:539",
      "414:550",
      "414:575",
      "414:590",
      "414:600",
      "414:618",
      "414:633",
      "414:655",
      "414:680",
      "414:699",
      "414:739",
      "414:720"
    ],
    "mark": {
      "examples": 0,
      "background": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "bgColor": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoTreatment": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoSizeRatio": null,
      "objectType": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      }
    },
    "background": {
      "value": null,
      "n": 8,
      "total": 19,
      "counts": {
        "gradient": 5,
        "photo": 6,
        "solid": 8
      }
    },
    "bgLight": {
      "n": 8,
      "total": 19,
      "value": 0.42105263157894735
    },
    "objectSide": {
      "value": "right",
      "n": 15,
      "total": 19,
      "counts": {
        "right": 15,
        "full-bleed": 4
      }
    },
    "objectType": {
      "value": null,
      "n": 9,
      "total": 19,
      "counts": {
        "illustration": 9,
        "building": 4,
        "logo-only": 4,
        "product": 2
      }
    },
    "objectWidthRatio": 0.46,
    "textAlign": {
      "value": "left",
      "n": 19,
      "total": 19,
      "counts": {
        "left": 19
      }
    },
    "textBlock": {
      "value": "left",
      "n": 19,
      "total": 19,
      "counts": {
        "left": 19
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.117,
    "mainWeight": {
      "value": "bold",
      "n": 19,
      "total": 19,
      "counts": {
        "bold": 19
      }
    },
    "subPresent": {
      "n": 0,
      "total": 19,
      "value": 0
    },
    "datePresent": {
      "n": 19,
      "total": 19,
      "value": 1
    },
    "logoPresent": {
      "n": 8,
      "total": 19,
      "value": 0.42105263157894735
    },
    "logoPosition": {
      "value": "right",
      "n": 6,
      "total": 8,
      "counts": {
        "top-left": 2,
        "right": 6
      }
    },
    "logoTreatment": {
      "value": "original-color",
      "n": 6,
      "total": 8,
      "counts": {
        "white": 2,
        "original-color": 6
      }
    },
    "logoSizeRatio": 0.335,
    "badgePresent": {
      "n": 6,
      "total": 19,
      "value": 0.3157894736842105
    },
    "badgeStyle": {
      "value": "tag",
      "n": 6,
      "total": 6,
      "counts": {
        "tag": 6
      }
    },
    "cta": {
      "value": null,
      "n": 0,
      "total": 19,
      "counts": {}
    },
    "whitespace": {
      "value": "balanced",
      "n": 12,
      "total": 19,
      "counts": {
        "balanced": 12,
        "airy": 2,
        "tight": 5
      }
    },
    "mainPx": 28,
    "byShape": {
      "strip": {
        "examples": 10,
        "objectSide": {
          "value": "right",
          "n": 8,
          "total": 10,
          "counts": {
            "right": 8,
            "full-bleed": 2
          }
        },
        "objectWidthRatio": 0.49,
        "textAlign": {
          "value": "left",
          "n": 10,
          "total": 10,
          "counts": {
            "left": 10
          }
        },
        "mainLines": 2,
        "mainPx": 28,
        "logoPosition": {
          "value": "right",
          "n": 3,
          "total": 4,
          "counts": {
            "top-left": 1,
            "right": 3
          }
        }
      },
      "wide": {
        "examples": 9,
        "objectSide": {
          "value": "right",
          "n": 7,
          "total": 9,
          "counts": {
            "right": 7,
            "full-bleed": 2
          }
        },
        "objectWidthRatio": 0.46,
        "textAlign": {
          "value": "left",
          "n": 9,
          "total": 9,
          "counts": {
            "left": 9
          }
        },
        "mainLines": 2,
        "mainPx": 20,
        "logoPosition": {
          "value": "right",
          "n": 3,
          "total": 4,
          "counts": {
            "top-left": 1,
            "right": 3
          }
        }
      },
      "tall": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "box": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      }
    },
    "typical": "잡다 소재는 대체로 브랜드색 단색이나 사진+그라데이션 오버레이 배경 위에, 좌측(x=50) 세로 중앙에 '모집기간+날짜' 한 줄 → Bold 28px 메인 2줄 → (선택) 반투명 태그 줄을 쌓고, 오른쪽 절반을 3D·일러스트·로고 오브젝트로 채우며 CTA 버튼은 없다 (MO는 메인 2줄 + 61% 날짜만)",
    "rules": [
      "텍스트 블록은 좌측 정렬, PC x=50·폭 480 / MO x=20·폭 260에서 세로 중앙 정렬 (18/19, 에스이에이 MO만 구 템플릿 고정 좌표)",
      "메인 카피는 항상 2줄 Bold — PC 28/38px(높이 대비 0.117), MO 20/28px(0.125) (19/19)",
      "PC는 메인 위에 '모집기간'/'접수기간' 라벨 + 날짜 한 줄(SemiBold 16) (10/10); MO는 라벨 없이 날짜가 메인 아래, 61% 불투명 (8/9, 에스이에이 MO는 100%)",
      "태그(Badge) 줄은 PC 전용 선택 요소 — PC 6/10에 있고 개수 1~9개, MO에는 없음 (0/9). 스타일: 12px SemiBold, 패딩 8×4, radius 4, 배경은 흰 30% 또는 브랜드 틴트",
      "오브젝트는 오른쪽 절반(폭 비율 0.1~0.5) (15/19) 또는 사진 풀블리드 (4/19); 왼쪽 텍스트 영역에는 오브젝트를 겹치지 않음 (19/19)",
      "사진을 깔 때는 텍스트 쪽에 그라데이션 오버레이(레이어명 Rectangle 34625125: 브랜드색·검정·흰색)를 둠 (6/6)",
      "텍스트 색은 배경에 맞춰 흰색(9) / 검정(4) / 브랜드 컬러(6) — 밝은 배경이면 절반 이상이 브랜드색 텍스트를 씀 (6/10 밝은 배경)",
      "로고는 필수가 아님 (8/19에만) — 있으면 오른쪽 오브젝트 자리를 로고·CI 심볼로 대체(6)하거나 좌상단 흰 로고(코엑스 2)",
      "CTA 버튼 없음 (19/19). 'Button_Primary Round'(라벨 '취업미션카드 보러가기')는 PC 8개 프레임에 hidden 상태로 캔버스 밖 y=240에 놓인 잡다 DS 컴포넌트 잔재이지 소재 요소가 아님",
      "PC/MO 한 쌍은 같은 배경·오브젝트·텍스트색을 쓰고, MO에서 라벨칩·태그·날짜 부가표기('22시','15:00까지')를 빼고 오브젝트를 축소 (9/9 쌍)"
    ]
  },
  "kakao": {
    "examples": 7,
    "nodeIds": [
      "421:5454",
      "421:5455",
      "421:5456",
      "421:5457",
      "421:5461",
      "421:5438",
      "421:5491"
    ],
    "mark": {
      "examples": 3,
      "background": {
        "value": "solid",
        "n": 2,
        "total": 3,
        "counts": {
          "solid": 2,
          "gradient": 1
        }
      },
      "bgColor": {
        "value": "#FFFFFF",
        "n": 2,
        "total": 3,
        "counts": {
          "#FFFFFF": 2,
          "#9F2827 → #270A0A": 1
        }
      },
      "logoTreatment": {
        "value": "original-color",
        "n": 2,
        "total": 3,
        "counts": {
          "original-color": 2,
          "white": 1
        }
      },
      "logoSizeRatio": 0.75,
      "objectType": {
        "value": "logo-only",
        "n": 3,
        "total": 3,
        "counts": {
          "logo-only": 3
        }
      }
    },
    "background": {
      "value": "transparent",
      "n": 6,
      "total": 7,
      "counts": {
        "transparent": 6,
        "gradient": 1
      }
    },
    "bgLight": {
      "n": 1,
      "total": 1,
      "value": null
    },
    "objectSide": {
      "value": "right",
      "n": 7,
      "total": 7,
      "counts": {
        "right": 7
      }
    },
    "objectType": {
      "value": "illustration",
      "n": 4,
      "total": 7,
      "counts": {
        "illustration": 4,
        "logo-only": 2,
        "product": 1
      }
    },
    "objectWidthRatio": 0.3,
    "textAlign": {
      "value": "left",
      "n": 7,
      "total": 7,
      "counts": {
        "left": 7
      }
    },
    "textBlock": {
      "value": "left",
      "n": 7,
      "total": 7,
      "counts": {
        "left": 7
      }
    },
    "mainLines": 1,
    "mainSizeRatio": 0.155,
    "mainWeight": {
      "value": "bold",
      "n": 6,
      "total": 7,
      "counts": {
        "bold": 6,
        "black": 1
      }
    },
    "subPresent": {
      "n": 6,
      "total": 7,
      "value": 0.8571428571428571
    },
    "datePresent": {
      "n": 5,
      "total": 7,
      "value": 0.7142857142857143
    },
    "logoPresent": {
      "n": 7,
      "total": 7,
      "value": 1
    },
    "logoPosition": {
      "value": null,
      "n": 2,
      "total": 7,
      "counts": {
        "top-right": 2,
        "right": 2,
        "inline-with-copy": 2,
        "top-left": 1
      }
    },
    "logoTreatment": {
      "value": "original-color",
      "n": 7,
      "total": 7,
      "counts": {
        "original-color": 7
      }
    },
    "logoSizeRatio": 0.17,
    "badgePresent": {
      "n": 0,
      "total": 7,
      "value": 0
    },
    "badgeStyle": {
      "value": null,
      "n": 0,
      "total": 0,
      "counts": {}
    },
    "cta": {
      "value": null,
      "n": 0,
      "total": 7,
      "counts": {}
    },
    "whitespace": {
      "value": "balanced",
      "n": 5,
      "total": 7,
      "counts": {
        "balanced": 5,
        "airy": 2
      }
    },
    "mainPx": 40,
    "byShape": {
      "strip": {
        "examples": 6,
        "objectSide": {
          "value": "right",
          "n": 6,
          "total": 6,
          "counts": {
            "right": 6
          }
        },
        "objectWidthRatio": 0.3,
        "textAlign": {
          "value": "left",
          "n": 6,
          "total": 6,
          "counts": {
            "left": 6
          }
        },
        "mainLines": 1,
        "mainPx": 40,
        "logoPosition": {
          "value": null,
          "n": 2,
          "total": 6,
          "counts": {
            "top-right": 2,
            "right": 2,
            "inline-with-copy": 2
          }
        }
      },
      "wide": {
        "examples": 1,
        "objectSide": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "right": 1
          }
        },
        "objectWidthRatio": 0.27,
        "textAlign": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "left": 1
          }
        },
        "mainLines": 2,
        "mainPx": 63,
        "logoPosition": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "top-left": 1
          }
        }
      },
      "tall": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "box": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      }
    },
    "typical": "카카오 비즈보드는 대체로 투명 배경 위에 왼쪽 정렬 카피 1줄(#4C4C4C Bold) + 날짜 1줄(#777777 Regular), 오른쪽 약 30%에 업종 연관 누끼 오브젝트·로고·둥근 썸네일 박스 중 하나를 두고 소형 로고는 우상단; PC 디스플레이는 프로필 300×300이 흰 배경 로고 단독, 홍보 1200×600은 그라데이션 배경에 로고 단독 또는 좌측 카피+우하단 일러스트",
    "rules": [
      "비즈보드 배경은 투명 PNG이며 박스형 배경을 깔지 않는다(6/6)",
      "비즈보드 메인 카피는 1줄, 기간/서브는 1줄 — 총 2줄을 넘기지 않는다(6/6)",
      "비즈보드 텍스트 색은 메인 #4C4C4C, 서브·날짜 #777777로 고정한다(6/6; 로고를 메인으로 쓴 안랩 2장만 첫 줄이 브랜드 남색 워드마크)",
      "비즈보드 텍스트는 x≈50px부터 왼쪽 정렬, 오브젝트는 오른쪽 x≈615~980 구간에 폭 24~33%로 둔다(6/6)",
      "오른쪽 오브젝트는 누끼 일러스트(2)·제품(1)·로고 단독(2)·둥근 썸네일 박스(2, 313×185) 중 하나이며 채용 기업·업종과 관련 있어야 한다(가이드 문구, 6/6)",
      "배지·CTA 문구·버튼은 쓰지 않는다(10/10)",
      "날짜는 'M/D(요일)~M/D(요일)' 형식으로 서브 줄에 둔다(4/6; 안랩 2장은 날짜 대신 '2026년 신입/경력 채용')",
      "로고를 메인 문구로 쓸 때는 그래픽 요소 없는 순수 워드마크만 쓴다(반려 사례 다스, 안랩 2/2 준수)",
      "반려 대비 수정은 레이아웃을 건드리지 않고 문구만 최소로 고친다 — 안랩은 '6월' 두 글자만 삭제(1/1)",
      "PC 디스플레이 프로필(300×300)은 흰 배경에 원색 로고만 가운데 둔다(2/2), 홍보 이미지(1200×600)는 브랜드색 그라데이션 배경을 쓴다(2/2)"
    ]
  },
  "nap-dsp": {
    "examples": 19,
    "nodeIds": [
      "421:2786",
      "421:2795",
      "421:2804",
      "421:2818",
      "19:215",
      "421:2834",
      "421:2861",
      "421:2886",
      "421:2912",
      "421:2944",
      "421:2965",
      "421:2988",
      "421:3014",
      "421:3112",
      "421:3038",
      "421:3044",
      "421:3062",
      "421:3088",
      "421:3113"
    ],
    "mark": {
      "examples": 0,
      "background": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "bgColor": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoTreatment": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoSizeRatio": null,
      "objectType": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      }
    },
    "background": {
      "value": "solid",
      "n": 10,
      "total": 19,
      "counts": {
        "solid": 10,
        "transparent": 1,
        "gradient": 4,
        "pattern": 4
      }
    },
    "bgLight": {
      "n": 10,
      "total": 18,
      "value": 0.5555555555555556
    },
    "objectSide": {
      "value": "right",
      "n": 12,
      "total": 19,
      "counts": {
        "right": 12,
        "center": 3,
        "full-bleed": 2
      }
    },
    "objectType": {
      "value": "illustration",
      "n": 12,
      "total": 19,
      "counts": {
        "illustration": 12,
        "icon": 4,
        "product": 1
      }
    },
    "objectWidthRatio": 0.306,
    "textAlign": {
      "value": "left",
      "n": 17,
      "total": 19,
      "counts": {
        "left": 17,
        "center": 2
      }
    },
    "textBlock": {
      "value": "left",
      "n": 17,
      "total": 19,
      "counts": {
        "left": 17,
        "center": 2
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.14,
    "mainWeight": {
      "value": "bold",
      "n": 15,
      "total": 19,
      "counts": {
        "bold": 15,
        "black": 4
      }
    },
    "subPresent": {
      "n": 12,
      "total": 19,
      "value": 0.631578947368421
    },
    "datePresent": {
      "n": 14,
      "total": 19,
      "value": 0.7368421052631579
    },
    "logoPresent": {
      "n": 19,
      "total": 19,
      "value": 1
    },
    "logoPosition": {
      "value": null,
      "n": 6,
      "total": 19,
      "counts": {
        "inline-with-copy": 6,
        "top-left": 3,
        "top-right": 5,
        "right": 2,
        "bottom-right": 1,
        "bottom-center": 2
      }
    },
    "logoTreatment": {
      "value": "original-color",
      "n": 10,
      "total": 19,
      "counts": {
        "white": 9,
        "original-color": 10
      }
    },
    "logoSizeRatio": 0.17,
    "badgePresent": {
      "n": 16,
      "total": 19,
      "value": 0.8421052631578947
    },
    "badgeStyle": {
      "value": "pill",
      "n": 12,
      "total": 16,
      "counts": {
        "tag": 4,
        "pill": 12
      }
    },
    "cta": {
      "value": null,
      "n": 0,
      "total": 19,
      "counts": {}
    },
    "whitespace": {
      "value": "balanced",
      "n": 10,
      "total": 19,
      "counts": {
        "tight": 6,
        "balanced": 10,
        "airy": 3
      }
    },
    "mainPx": 21,
    "byShape": {
      "strip": {
        "examples": 11,
        "objectSide": {
          "value": "right",
          "n": 9,
          "total": 11,
          "counts": {
            "right": 9
          }
        },
        "objectWidthRatio": 0.29,
        "textAlign": {
          "value": "left",
          "n": 11,
          "total": 11,
          "counts": {
            "left": 11
          }
        },
        "mainLines": 1,
        "mainPx": 15,
        "logoPosition": {
          "value": null,
          "n": 4,
          "total": 11,
          "counts": {
            "inline-with-copy": 4,
            "top-left": 1,
            "top-right": 3,
            "right": 2,
            "bottom-right": 1
          }
        }
      },
      "wide": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "tall": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "box": {
        "examples": 8,
        "objectSide": {
          "value": null,
          "n": 3,
          "total": 8,
          "counts": {
            "right": 3,
            "center": 3,
            "full-bleed": 2
          }
        },
        "objectWidthRatio": 0.8,
        "textAlign": {
          "value": "left",
          "n": 6,
          "total": 8,
          "counts": {
            "left": 6,
            "center": 2
          }
        },
        "mainLines": 2,
        "mainPx": 27,
        "logoPosition": {
          "value": null,
          "n": 2,
          "total": 8,
          "counts": {
            "top-left": 2,
            "inline-with-copy": 2,
            "top-right": 2,
            "bottom-center": 2
          }
        }
      }
    },
    "typical": "NAP DSP 소재는 고객 한 곳당 브랜드 단색이나 그라데이션 배경 하나를 모든 사이즈에 똑같이 쓴다. 띠배너(320×50/100)는 왼쪽 메인 1–2줄과 기간 태그를 두고 오른쪽 20–32%에 오브젝트를 둔다. 전면(300×250/320×480)은 로고→메인→기간→모집분야를 왼쪽이나 가운데로 쌓고 아래쪽에 크게 오브젝트를 둔다. 비즈보드는 흰 배경 왼쪽에 회색 텍스트 2줄+AD 표기, 오른쪽에 라운드 이미지 카드.",
    "rules": [
      "320×50: 텍스트는 최대 2행(메인 1줄 + 아이브로우나 기간 1줄), 메인 글자 높이는 H의 ≈24–30%(12–15px), 시작 x≈11–16. 모집분야는 늘 빠지고(4/4) HS는 기간까지 뺌 (1/4)",
      "320×100: 메인 1–2줄(글자 높이 H의 13–20%)에 기간 pill·태그 한 줄이나 해시태그 한 줄을 더한다 (4/4). 로고는 따로 한 줄(안랩)이거나 오른쪽 칼럼·우상단(HS·마이다스)",
      "300×250: 로고·아이브로우 → 메인 2줄(글자 높이 H의 ≈7–9%, 18–23px) → 기간 → 모집분야를 왼쪽 정렬로 쌓고 x≈20–24에서 시작한다 (4/4). 전면형이 되면 비로소 모집분야가 들어간다 (3/4)",
      "320×480: 메인 2–3줄(27–35px, H의 ≈5.6–7.3%). 오브젝트는 아래쪽 25–40%에 폭 77–100%로 깐다 (4/4). 정렬은 가운데 2(GC·HS), 왼쪽 2(안랩·마이다스)",
      "오브젝트 폭은 사이즈에 따라 커진다: 띠배너에서는 오른쪽 20–32%, 전면에서는 45–100%(오른쪽 아래나 하단 전체) (오브젝트가 있는 고객 3/3). 마이다스는 띠배너에 오브젝트가 없고 전면에만 계단 그래픽을 넣음",
      "사이즈가 작아지면 모집분야 → 기간 순으로 뺀다. 로고와 메인은 모든 사이즈에 남는다 (19/19 로고)",
      "배경·브랜드색·카피 색은 고객마다 모든 사이즈에서 같다 (4/4 고객)",
      "기간·라벨은 pill(네이비·크림·오렌지 채움)이나 흰 라벨 태그 + 값 형태 (16/19 badge)",
      "비즈보드 1029×258: 왼쪽 x≈48–55에 메인 1줄(#4C4C4C bold, H의 ≈17–18%. 안랩은 네이비 로고 워드마크가 메인) → 서브 1줄(#777777 regular, H의 ≈14–15%) → 'AD' pill(#D9D9D9·흰 글자) + 'nap dsp 광고입니다'(#777777) (AD 2/3, 카카오판 안랩은 없음). 오른쪽 x≈662–980에 라운드(≈16px) 이미지 카드 ≈315×185(폭 30.5%)를 두고, 카드 안에 원 소재 배경·오브젝트·로고를 넣는다 (3/3)",
      "CTA 버튼·텍스트가 없다 (19/19)"
    ]
  },
  "naver-gfa": {
    "examples": 2,
    "nodeIds": [
      "421:6995",
      "421:7058"
    ],
    "mark": {
      "examples": 4,
      "background": {
        "value": "solid",
        "n": 4,
        "total": 4,
        "counts": {
          "solid": 4
        }
      },
      "bgColor": {
        "value": "#FFFFFF",
        "n": 2,
        "total": 4,
        "counts": {
          "#0460AF": 1,
          "#E9F2FF": 1,
          "#FFFFFF": 2
        }
      },
      "logoTreatment": {
        "value": "original-color",
        "n": 2,
        "total": 2,
        "counts": {
          "original-color": 2
        }
      },
      "logoSizeRatio": 0.78,
      "objectType": {
        "value": "illustration",
        "n": 2,
        "total": 4,
        "counts": {
          "illustration": 2,
          "logo-only": 2
        }
      }
    },
    "background": {
      "value": "gradient",
      "n": 2,
      "total": 2,
      "counts": {
        "gradient": 2
      }
    },
    "bgLight": {
      "n": 1,
      "total": 2,
      "value": 0.5
    },
    "objectSide": {
      "value": "right",
      "n": 2,
      "total": 2,
      "counts": {
        "right": 2
      }
    },
    "objectType": {
      "value": null,
      "n": 1,
      "total": 2,
      "counts": {
        "illustration": 1,
        "product": 1
      }
    },
    "objectWidthRatio": 0.38,
    "textAlign": {
      "value": "left",
      "n": 2,
      "total": 2,
      "counts": {
        "left": 2
      }
    },
    "textBlock": {
      "value": "left",
      "n": 2,
      "total": 2,
      "counts": {
        "left": 2
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.087,
    "mainWeight": {
      "value": "bold",
      "n": 2,
      "total": 2,
      "counts": {
        "bold": 2
      }
    },
    "subPresent": {
      "n": 1,
      "total": 2,
      "value": 0.5
    },
    "datePresent": {
      "n": 2,
      "total": 2,
      "value": 1
    },
    "logoPresent": {
      "n": 2,
      "total": 2,
      "value": 1
    },
    "logoPosition": {
      "value": null,
      "n": 1,
      "total": 2,
      "counts": {
        "top-right": 1,
        "bottom-left": 1
      }
    },
    "logoTreatment": {
      "value": null,
      "n": 1,
      "total": 2,
      "counts": {
        "original-color": 1,
        "white": 1
      }
    },
    "logoSizeRatio": 0.197,
    "badgePresent": {
      "n": 1,
      "total": 2,
      "value": 0.5
    },
    "badgeStyle": {
      "value": null,
      "n": 1,
      "total": 1,
      "counts": {
        "pill": 1
      }
    },
    "cta": {
      "value": null,
      "n": 0,
      "total": 2,
      "counts": {}
    },
    "whitespace": {
      "value": "balanced",
      "n": 2,
      "total": 2,
      "counts": {
        "balanced": 2
      }
    },
    "mainPx": 49,
    "byShape": {
      "strip": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "wide": {
        "examples": 2,
        "objectSide": {
          "value": "right",
          "n": 2,
          "total": 2,
          "counts": {
            "right": 2
          }
        },
        "objectWidthRatio": 0.38,
        "textAlign": {
          "value": "left",
          "n": 2,
          "total": 2,
          "counts": {
            "left": 2
          }
        },
        "mainLines": 2,
        "mainPx": 49,
        "logoPosition": {
          "value": null,
          "n": 1,
          "total": 2,
          "counts": {
            "top-right": 1,
            "bottom-left": 1
          }
        }
      },
      "tall": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "box": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      }
    },
    "typical": "모바일DA(1250×560)는 연한 그라데이션이나 브랜드 단색 배경에 왼쪽 정렬 메인 2줄과 기간을 두고, 오른쪽 아래에 오브젝트, 로고는 카피 블록 우상단이나 좌하단에 둔다. 네이티브(342×228)는 텍스트 없는 가운데 일러스트, 프로필(300×300)은 흰 배경 가운데 원색 가로형 로고다.",
    "rules": [
      "모바일DA 카피는 좌 240 텍스트 여백선보다 15–34px 안쪽(x≈255–274)에서 시작하고, 상단 50선보다 16–59px 아래(y≈66–109)에서 시작한다 (2/2, 템플릿 포함 3/3)",
      "모바일DA 메인 카피는 2줄 bold, 글자 높이는 캔버스 높이의 ≈8–9%(45–50px) (2/2)",
      "메인 바로 아래에 기간 정보가 온다. 텍스트 1줄('모집 기간 | …')이거나 아웃라인 pill (2/2)",
      "오브젝트는 오른쪽 아래, 폭 21–38%. 오른쪽 끝 x≤1002로 오브젝트 여백선(1025)과 텍스트 여백선(1010) 안에 든다. 아래쪽은 525선까지 내려오며 대원은 ≈6px 넘는다 (2/2)",
      "로고는 카피 블록에 붙인다. 메인 1행 옆 우상단(콜마)이거나 카피 열 좌하단(대원, 템플릿과 같음) (2/2, 위치는 둘로 나뉨)",
      "카피는 배경과 대비되는 한 가지 색(네이비나 흰색)으로 쓰고, 강조는 브랜드색 키워드 한 곳만 준다 (1/2, 대원은 흰색만)",
      "네이티브 342×228은 텍스트와 로고 없이 브랜드 단색 배경에 가운데 일러스트(폭 ≈73–74%)만 둔다. 브랜드명은 일러스트 속 간판이나 입체 레터로 보인다 (2/2)",
      "프로필·로고 300×300은 흰 배경에 원색 가로형 로고를 상하·좌우 가운데 둔다. 로고 폭 78–90%, 좌우 패딩 5–11%, 배경 장식 없음 (2/2)",
      "CTA 버튼·텍스트가 없다 (6/6)"
    ]
  },
  "remember": {
    "examples": 4,
    "nodeIds": [
      "414:23",
      "414:22",
      "414:24",
      "414:32"
    ],
    "mark": {
      "examples": 0,
      "background": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "bgColor": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoTreatment": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      },
      "logoSizeRatio": null,
      "objectType": {
        "value": null,
        "n": 0,
        "total": 0,
        "counts": {}
      }
    },
    "background": {
      "value": "solid",
      "n": 4,
      "total": 4,
      "counts": {
        "solid": 4
      }
    },
    "bgLight": {
      "n": 0,
      "total": 4,
      "value": 0
    },
    "objectSide": {
      "value": "right",
      "n": 4,
      "total": 4,
      "counts": {
        "right": 4
      }
    },
    "objectType": {
      "value": "illustration",
      "n": 2,
      "total": 4,
      "counts": {
        "illustration": 2,
        "people-photo": 2
      }
    },
    "objectWidthRatio": 0.42,
    "textAlign": {
      "value": "left",
      "n": 4,
      "total": 4,
      "counts": {
        "left": 4
      }
    },
    "textBlock": {
      "value": "left",
      "n": 4,
      "total": 4,
      "counts": {
        "left": 4
      }
    },
    "mainLines": 2,
    "mainSizeRatio": 0.15,
    "mainWeight": {
      "value": "medium",
      "n": 4,
      "total": 4,
      "counts": {
        "medium": 4
      }
    },
    "subPresent": {
      "n": 1,
      "total": 4,
      "value": 0.25
    },
    "datePresent": {
      "n": 1,
      "total": 4,
      "value": 0.25
    },
    "logoPresent": {
      "n": 0,
      "total": 4,
      "value": 0
    },
    "logoPosition": {
      "value": null,
      "n": 0,
      "total": 0,
      "counts": {}
    },
    "logoTreatment": {
      "value": null,
      "n": 0,
      "total": 0,
      "counts": {}
    },
    "logoSizeRatio": null,
    "badgePresent": {
      "n": 0,
      "total": 4,
      "value": 0
    },
    "badgeStyle": {
      "value": null,
      "n": 0,
      "total": 0,
      "counts": {}
    },
    "cta": {
      "value": null,
      "n": 0,
      "total": 4,
      "counts": {}
    },
    "whitespace": {
      "value": "airy",
      "n": 3,
      "total": 4,
      "counts": {
        "balanced": 1,
        "airy": 3
      }
    },
    "mainPx": 41,
    "byShape": {
      "strip": {
        "examples": 3,
        "objectSide": {
          "value": "right",
          "n": 3,
          "total": 3,
          "counts": {
            "right": 3
          }
        },
        "objectWidthRatio": 0.4,
        "textAlign": {
          "value": "left",
          "n": 3,
          "total": 3,
          "counts": {
            "left": 3
          }
        },
        "mainLines": 2,
        "mainPx": 41,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "wide": {
        "examples": 1,
        "objectSide": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "right": 1
          }
        },
        "objectWidthRatio": 0.42,
        "textAlign": {
          "value": null,
          "n": 1,
          "total": 1,
          "counts": {
            "left": 1
          }
        },
        "mainLines": 2,
        "mainPx": 25,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "tall": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      },
      "box": {
        "examples": 0,
        "objectSide": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "objectWidthRatio": null,
        "textAlign": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        },
        "mainLines": null,
        "mainPx": null,
        "logoPosition": {
          "value": null,
          "n": 0,
          "total": 0,
          "counts": {}
        }
      }
    },
    "typical": "리멤버 소재는 대체로 짙은 네이비 단색 배경 위에 왼쪽 정렬 흰색 카피(PC 상단은 메인 1줄+기간 1줄, MO·사이드는 메인 2줄), 오른쪽 40% 안팎에 배경색으로 페이드되는 인물 사진·캐릭터(썸네일형), 로고·배지·CTA 없음",
    "rules": [
      "텍스트는 흰색 단색이고 가이드상 검정·흰색 두 가지만 허용된다(4/4 흰색)",
      "카피는 왼쪽 정렬, 왼쪽 블록, 세로 가운데에 둔다(4/4)",
      "이미지는 오른쪽 40~43%를 차지하고 왼쪽 경계를 배경색 그라데이션으로 녹인다(4/4, 템플릿 6/6도 동일)",
      "배너 안에 로고·배지·CTA 버튼을 넣지 않는다(4/4; 이미지 규정도 '회사 로고 없는 이미지')",
      "MO·사이드 규격은 메인 2줄, 부가 문구 없음(3/3); PC 상단은 메인 1줄 + 부가(기간) 1줄(1/1)",
      "배경은 흰색·검정·#FF5414·#F7F7F0·#E8E7E0을 쓰지 않고 어두운 네이비 계열을 쓴다(4/4 네이비 #19253C~#364B78)",
      "메인 카피 글자 높이는 캔버스 높이의 약 0.13~0.15(4/4)",
      "공고 상세 사이드 배너는 썸네일형만 허용되고, 이미지 안에는 텍스트·꾸밈 요소를 넣지 않는다(가이드)",
      "글자수: PC 메인 24자·부가 30~35자, MO 12자×2줄, 사이드 10자+8자(공백 포함, 글자수 정리표)"
    ]
  }
};

export function designOf(mediumId) { return DESIGN[mediumId] ?? null; }
