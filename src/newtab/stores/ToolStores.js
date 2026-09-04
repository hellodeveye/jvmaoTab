import {
  observable,
  action,
  computed,
  makeObservable,
  autorun
} from "mobx";
import {
  getID
} from "~/utils";
import {
  downloadBlob
} from "~/utils";
import {
  db
} from "~/db";
import _ from "lodash";
import dayjs from 'dayjs'
import { toPlainPositions } from "~/utils/homeLinkLayout";
import manifest from "../../manifest";

export default class ToolsStores {
  rightClickOpen = false;
  rightClickEvent = {
    mouseX: 0,
    mouseY: 0,
  };
  rightClickMenu = null;
  messageApi = null;
  preferencesOpen = false;
  tabListDrawer = false;

  openPublicModalEvent$ = null;

  timeKey = "";

  /** 首屏分组布局重置信号（仅内存，不落库） */
  homeLinkLayoutEpoch = 0;

  /** 「去小组件页」的意图信号：首屏卡片盖在主区域之上，得先解锁再跳路由，
      而解锁状态在 Home 里，所以这里只发信号，由 Home 执行 */
  gotoWidgets = false;

  rootStore;

  constructor(rootStore) {
    makeObservable(this, {
      rightClickOpen: observable,
      rightClickEvent: observable,
      rightClickMenu: observable,
      preferencesOpen: observable,
      messageApi: observable,
      tabListDrawer: observable,
      openPublicModalEvent$: observable,
      timeKey: observable,
      homeLinkLayoutEpoch: observable,
      gotoWidgets: observable,
      openWidgetsPage: action,
      setRightClickEvent: action,
      setOpenPublicModalEvent: action,
      writeHomeLinkLayout: action,
      applyHomeLinkLayout: action,
      resetHomeLinkLayout: action,
    });
    this.rootStore = rootStore;
  }

  /** 写坐标表并通知首屏重排；失败时恢复内存中的原坐标 */
  async writeHomeLinkLayout(positions) {
    const { option } = this.rootStore;
    const previous = _.cloneDeep(option.item.homeLinkPositions || {});
    try {
      await option.setItem("homeLinkPositions", positions, false);
      this.homeLinkLayoutEpoch += 1;
    } catch (error) {
      option.item.homeLinkPositions = previous;
      throw error;
    }
  }

  /**
   * 保存某一屏整理后的坐标。两屏共用一张坐标表,所以只能合并覆盖本屏那几个键——
   * 整表替换会把另一屏的坐标一起抹掉,那一屏的分组下次重排时全成了「新分组」,
   * 被瀑布流兜底斜着摞成一堆。
   */
  async applyHomeLinkLayout(positions = {}) {
    const { option } = this.rootStore;
    const previous = toPlainPositions(option.item.homeLinkPositions);
    await this.writeHomeLinkLayout({ ...previous, ...positions });
  }

  /** 清空坐标表:所有分组回到默认瀑布流(首选项里的「重置首屏分组布局」) */
  async resetHomeLinkLayout() {
    await this.writeHomeLinkLayout({});
  }

  /** 首屏上的组件可以用它把用户送到小组件页（比如密钥失效时） */
  openWidgetsPage() {
    this.gotoWidgets = true;
  }

  setRightClickEvent(e, menu = []) {
    if (e) {
      this.rightClickOpen = true;
      this.rightClickEvent = {
        mouseX: e?.clientX + 10,
        mouseY: e?.clientY + 10,
      };
      this.rightClickMenu = menu;
    } else {
      this.rightClickOpen = false;
    }
  }

  success(message = "") {
    if (message) {
      this.messageApi.success(message);
    }
  }
  error(message = "") {
    if (message) {
      this.messageApi.error(message);
    }
  }

  updateTimeKey() {
    this.timeKey = getID();
  }

  setOpenPublicModalEvent(event) {
    this.openPublicModalEvent$ = event;
  }

  openPublicModal(type, data = {}, width = 600, title = "") {
    if (this.openPublicModalEvent$) {
      this.openPublicModalEvent$.emit({
        type,
        data,
        width,
        title,
      });
    }
  }

  closePublicModal() {
    if (this.openPublicModalEvent$) {
      this.openPublicModalEvent$.emit({
        type: "close",
      });
    }
  }

  onExport = async () => {
    try {
      const blob = await this.rootStore.data.get_dbData();
      const fileName = `newtab_${manifest.version}_${db.verno * 10}_${dayjs().format('YYMMDDHHmmss')}.json`;
      downloadBlob(blob, fileName);
      this.success('数据导出成功');
      return true;
    } catch (error) {
      this.error(`${error.message}`);
      return false;
    }

  }
}
