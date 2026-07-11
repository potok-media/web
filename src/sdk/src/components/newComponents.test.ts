import { describe, it, expect } from "vitest";
import {
  ImageBuilder,
  IconBuilder,
  TabsBuilder,
  ListBuilder,
  TooltipBuilder,
  ProgressBarBuilder,
  SkeletonBuilder,
  EmptyStateBuilder,
  AlertBuilder,
  ChipBuilder,
  IconButtonBuilder,
  ButtonBuilder,
  ModalBuilder,
  CollapsibleBuilder,
  AvatarBuilder,
  RatingBuilder,
  TagListBuilder,
  SectionHeaderBuilder,
} from "./common";
import {
  ContentCardBuilder,
  ContentRowBuilder,
  HeroBuilder,
  ContinueWatchingRowBuilder,
  TopTenRowBuilder,
  PosterGridBuilder,
  DetailHeroBuilder,
} from "./media";
import {
  RangeBuilder,
  SegmentedBuilder,
  DropdownBuilder,
  FileInputBuilder,
  FieldBuilder,
  CarouselBuilder,
  ScrollerBuilder,
  PageBuilder,
} from "./common";

const noop = () => {};

describe("Phase-1 generic content builders", () => {
  it("ContentCard compiles with item + onClick event", () => {
    const json = new ContentCardBuilder()
      .item({ id: "a", title: "Hello" })
      .orientation("landscape")
      .onClick(noop)
      .compile("root");
    expect(json.type).toBe("ContentCard");
    expect(json.props.item).toEqual({ id: "a", title: "Hello" });
    expect(json.props.orientation).toBe("landscape");
    expect(typeof json.events!.onClick).toBe("string");
  });

  it("ContentRow carries items + both events", () => {
    const json = new ContentRowBuilder()
      .title("Row")
      .items([{ id: "1", title: "One" }])
      .onCardClick(noop)
      .onSeeAllClick(noop)
      .compile("root");
    expect(json.type).toBe("ContentRow");
    expect(json.props.title).toBe("Row");
    expect(json.props.items).toHaveLength(1);
    expect(json.events!.onCardClick).toBeTruthy();
    expect(json.events!.onSeeAllClick).toBeTruthy();
  });

  it("Hero exposes onPlay + onDetails", () => {
    const json = new HeroBuilder()
      .items([{ id: "h", title: "Hero" }])
      .onPlay(noop)
      .onDetails(noop)
      .compile("root");
    expect(json.type).toBe("Hero");
    expect(json.events!.onPlay).toBeTruthy();
    expect(json.events!.onDetails).toBeTruthy();
  });
});

describe("Phase-1 primitive builders", () => {
  it("Image sets src + onClick", () => {
    const json = new ImageBuilder("x.jpg").alt("alt").aspectRatio("16/9").onClick(noop).compile("root");
    expect(json.type).toBe("Image");
    expect(json.props.src).toBe("x.jpg");
    expect(json.props.aspectRatio).toBe("16/9");
    expect(json.events!.onClick).toBeTruthy();
  });

  it("Icon carries name", () => {
    const json = new IconBuilder("heart").size("2rem").compile("root");
    expect(json.type).toBe("Icon");
    expect(json.props.name).toBe("heart");
    expect(json.props.size).toBe("2rem");
  });

  it("Tabs carries items/value + onChange", () => {
    const json = new TabsBuilder()
      .items([{ id: "a", label: "A" }])
      .value("a")
      .onChange(noop)
      .compile("root");
    expect(json.props.items).toHaveLength(1);
    expect(json.props.value).toBe("a");
    expect(json.events!.onChange).toBeTruthy();
  });

  it("List carries items + onItemClick", () => {
    const json = new ListBuilder()
      .items([{ id: "a", title: "A" }])
      .onItemClick(noop)
      .compile("root");
    expect(json.props.items).toHaveLength(1);
    expect(json.events!.onItemClick).toBeTruthy();
  });

  it("Tooltip wraps a compiled child + text", () => {
    const json = new TooltipBuilder("tip")
      .placement("bottom")
      .child(new ButtonBuilder("Btn"))
      .compile("root");
    expect(json.props.text).toBe("tip");
    expect(json.props.placement).toBe("bottom");
    expect(json.children).toHaveLength(1);
    expect(json.children![0].type).toBe("Button");
  });

  it("ProgressBar carries value + variant", () => {
    const json = new ProgressBarBuilder().value(0.5).variant("success").showValue(true).compile("root");
    expect(json.props.value).toBe(0.5);
    expect(json.props.variant).toBe("success");
    expect(json.props.showValue).toBe(true);
  });

  it("Skeleton carries count", () => {
    const json = new SkeletonBuilder().count(3).rounded("0.5rem").compile("root");
    expect(json.props.count).toBe(3);
    expect(json.props.rounded).toBe("0.5rem");
  });

  it("EmptyState carries fields + onAction", () => {
    const json = new EmptyStateBuilder()
      .icon("inbox")
      .title("Empty")
      .description("desc")
      .actionLabel("Add")
      .onAction(noop)
      .compile("root");
    expect(json.props.title).toBe("Empty");
    expect(json.props.actionLabel).toBe("Add");
    expect(json.events!.onAction).toBeTruthy();
  });

  it("Alert carries text + variant", () => {
    const json = new AlertBuilder("Heads up").variant("warning").title("Warn").compile("root");
    expect(json.props.text).toBe("Heads up");
    expect(json.props.variant).toBe("warning");
    expect(json.props.title).toBe("Warn");
  });

  it("Chip carries active + onClick", () => {
    const json = new ChipBuilder("Tag").active(true).icon("star").onClick(noop).compile("root");
    expect(json.props.text).toBe("Tag");
    expect(json.props.active).toBe(true);
    expect(json.events!.onClick).toBeTruthy();
  });

  it("IconButton carries icon + onClick", () => {
    const json = new IconButtonBuilder("play").label("Play").accent(true).onClick(noop).compile("root");
    expect(json.props.icon).toBe("play");
    expect(json.props.label).toBe("Play");
    expect(json.events!.onClick).toBeTruthy();
  });
});

describe("Phase-2 builders", () => {
  it("Modal carries props + children + onClose", () => {
    const json = new ModalBuilder()
      .open(true)
      .title("T")
      .variant("sheet")
      .closeOnBackdrop(false)
      .onClose(noop)
      .child(new ButtonBuilder("OK"))
      .compile("root");
    expect(json.type).toBe("Modal");
    expect(json.props.open).toBe(true);
    expect(json.props.variant).toBe("sheet");
    expect(json.props.closeOnBackdrop).toBe(false);
    expect(json.events!.onClose).toBeTruthy();
    expect(json.children).toHaveLength(1);
  });

  it("Collapsible carries open + onToggle + children", () => {
    const json = new CollapsibleBuilder("Секция")
      .open(true)
      .onToggle(noop)
      .child(new ButtonBuilder("X"))
      .compile("root");
    expect(json.props.title).toBe("Секция");
    expect(json.props.open).toBe(true);
    expect(json.events!.onToggle).toBeTruthy();
    expect(json.children).toHaveLength(1);
  });

  it("Avatar carries src + name + shape", () => {
    const json = new AvatarBuilder("a.jpg").name("Ann").size("lg").shape("square").fallback("b.jpg").compile("root");
    expect(json.props.src).toBe("a.jpg");
    expect(json.props.name).toBe("Ann");
    expect(json.props.shape).toBe("square");
    expect(json.props.fallback).toBe("b.jpg");
  });

  it("Rating carries value + max + showValue", () => {
    const json = new RatingBuilder().value(4.5).max(5).showValue(true).size("sm").compile("root");
    expect(json.props.value).toBe(4.5);
    expect(json.props.max).toBe(5);
    expect(json.props.showValue).toBe(true);
  });

  it("TagList carries tags + onTagClick", () => {
    const json = new TagListBuilder().tags(["a", { id: "b", label: "B" }]).onTagClick(noop).compile("root");
    expect(json.props.tags).toHaveLength(2);
    expect(json.events!.onTagClick).toBeTruthy();
  });

  it("SectionHeader carries title + action + onAction", () => {
    const json = new SectionHeaderBuilder("Раздел").subtitle("sub").actionLabel("Все").onAction(noop).compile("root");
    expect(json.props.title).toBe("Раздел");
    expect(json.props.subtitle).toBe("sub");
    expect(json.props.actionLabel).toBe("Все");
    expect(json.events!.onAction).toBeTruthy();
  });
});

describe("Phase-2 batch 2 builders", () => {
  it("ContinueWatchingRow carries items + onCardClick", () => {
    const json = new ContinueWatchingRowBuilder().title("CW").items([{ id: "1", title: "A", progress: 0.5 }]).onCardClick(noop).compile("root");
    expect(json.type).toBe("ContinueWatchingRow");
    expect(json.props.items).toHaveLength(1);
    expect(json.events!.onCardClick).toBeTruthy();
  });

  it("TopTenRow carries items + onCardClick", () => {
    const json = new TopTenRowBuilder().title("Top").items([{ id: "1", title: "A" }]).onCardClick(noop).compile("root");
    expect(json.type).toBe("TopTenRow");
    expect(json.events!.onCardClick).toBeTruthy();
  });

  it("PosterGrid carries items + onCardClick + onLoadMore", () => {
    const json = new PosterGridBuilder().items([{ id: "1", title: "A" }]).minWidth("10rem").loadMoreLabel("More").onCardClick(noop).onLoadMore(noop).compile("root");
    expect(json.props.minWidth).toBe("10rem");
    expect(json.props.loadMoreLabel).toBe("More");
    expect(json.events!.onCardClick).toBeTruthy();
    expect(json.events!.onLoadMore).toBeTruthy();
  });

  it("DetailHero carries item + actions + onAction", () => {
    const json = new DetailHeroBuilder()
      .item({ id: "1", title: "A" })
      .actions([{ id: "play", label: "Play" }])
      .onAction(noop)
      .compile("root");
    expect((json.props.item as { id: string }).id).toBe("1");
    expect(json.props.actions).toHaveLength(1);
    expect(json.events!.onAction).toBeTruthy();
  });

  it("Range carries value/min/max/step + onChange", () => {
    const json = new RangeBuilder("vol").value(50).min(0).max(100).step(1).label("Vol").showValue(true).onChange(noop).compile("root");
    expect(json.props.value).toBe(50);
    expect(json.props.min).toBe(0);
    expect(json.props.max).toBe(100);
    expect(json.props.step).toBe(1);
    expect(json.events!.onChange).toBeTruthy();
  });

  it("Segmented carries items/value + onChange", () => {
    const json = new SegmentedBuilder().items([{ id: "a", label: "A" }]).value("a").onChange(noop).compile("root");
    expect(json.props.items).toHaveLength(1);
    expect(json.props.value).toBe("a");
    expect(json.events!.onChange).toBeTruthy();
  });
});

describe("Phase-2 batch 3 builders", () => {
  it("Dropdown carries items/value + onSelect", () => {
    const json = new DropdownBuilder()
      .label("L")
      .icon("x")
      .items([{ id: "a", label: "A" }])
      .value("a")
      .onSelect(noop)
      .compile("root");
    expect(json.type).toBe("Dropdown");
    expect(json.props.items).toHaveLength(1);
    expect(json.props.value).toBe("a");
    expect(json.events!.onSelect).toBeTruthy();
  });

  it("FileInput carries accept/multiple + onChange", () => {
    const json = new FileInputBuilder("f").label("L").accept("image/*").multiple(true).onChange(noop).compile("root");
    expect(json.props.accept).toBe("image/*");
    expect(json.props.multiple).toBe(true);
    expect(json.events!.onChange).toBeTruthy();
  });

  it("Field carries label/hint + child", () => {
    const json = new FieldBuilder().label("L").hint("H").child(new ButtonBuilder("B")).compile("root");
    expect(json.props.label).toBe("L");
    expect(json.props.hint).toBe("H");
    expect(json.children).toHaveLength(1);
  });

  it("Carousel carries spacing + children", () => {
    const json = new CarouselBuilder().spacing(16).child(new ButtonBuilder("B")).compile("root");
    expect(json.type).toBe("Carousel");
    expect(json.props.spacing).toBe(16);
    expect(json.children).toHaveLength(1);
  });

  it("Scroller carries orientation + children", () => {
    const json = new ScrollerBuilder().orientation("horizontal").child(new ButtonBuilder("B")).compile("root");
    expect(json.props.orientation).toBe("horizontal");
    expect(json.children).toHaveLength(1);
  });

  it("Page carries title + children", () => {
    const json = new PageBuilder().title("P").child(new ButtonBuilder("B")).compile("root");
    expect(json.props.title).toBe("P");
    expect(json.children).toHaveLength(1);
  });
});

describe("Phase-1.5 curated style tokens (base UIComponent)", () => {
  it("any builder emits style tokens into props", () => {
    const json = new ButtonBuilder("Styled")
      .background("#1e1e2e")
      .textColor("#fff")
      .borderColor("rgba(255,255,255,.2)")
      .borderRadius("1rem")
      .shadow("0 8px 24px rgba(0,0,0,.3)")
      .opacity(0.9)
      .compile("root");
    expect(json.props.background).toBe("#1e1e2e");
    expect(json.props.textColor).toBe("#fff");
    expect(json.props.borderColor).toBe("rgba(255,255,255,.2)");
    expect(json.props.borderRadius).toBe("1rem");
    expect(json.props.shadow).toBe("0 8px 24px rgba(0,0,0,.3)");
    expect(json.props.opacity).toBe(0.9);
  });

  it("tokens are undefined when not set", () => {
    const json = new ButtonBuilder("Plain").compile("root");
    expect(json.props.background).toBeUndefined();
    expect(json.props.opacity).toBeUndefined();
  });
});
