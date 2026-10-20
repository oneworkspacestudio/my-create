// Generated from screens/Editor.aui; edit the AUI source.
import { Badge, Button, Divider, Field, Grid, Heading, Input, Page, Row, Section, Select, Spacer, Stack, Text } from "@/components/ui"

export function Editor({ data, onAction }: { data: any; onAction: (name: string) => void }) {
  return (
    <Page>
      <Stack variant="editor">
        <Row variant="editor-toolbar">
          <Button onClick={() => onAction("home")} variant="secondary" aria-label="Back to designs">← Designs</Button>
          <Input name="title" aria-label="Design name" />
          <Badge>{data.saveLabel}</Badge>
          <Spacer />
          <Button onClick={() => onAction("undo")} variant="icon" disabled={data.noUndo} aria-label="Undo">↶</Button>
          <Button onClick={() => onAction("redo")} variant="icon" disabled={data.noRedo} aria-label="Redo">↷</Button>
          <Button onClick={() => onAction("compare")} variant="secondary">Compare</Button>
          <Button onClick={() => onAction("save")}>Save design</Button>
          <Button onClick={() => onAction("exportDialog")} variant="secondary">Export</Button>
        </Row>
        <Row variant="canvas-tools">
          <Button onClick={() => onAction("addText")} variant="secondary">＋ Text</Button>
          <Button onClick={() => onAction("addRect")} variant="secondary">▢ Shape</Button>
          <Button onClick={() => onAction("addCircle")} variant="secondary">○ Circle</Button>
          <Button onClick={() => onAction("addImage")} variant="secondary">＋ Image</Button>
          <Button onClick={() => onAction("group")} variant="secondary">Group</Button>
          <Button onClick={() => onAction("ungroup")} variant="secondary">Ungroup</Button>
          <Button onClick={() => onAction("duplicate")} variant="secondary">Duplicate</Button>
          <Button onClick={() => onAction("delete")} variant="secondary">Delete</Button>
          <Spacer />
          <Button onClick={() => onAction("zoomOut")} variant="icon" aria-label="Zoom out">−</Button>
          <Text variant="caption">{data.zoomLabel}</Text>
          <Button onClick={() => onAction("zoomIn")} variant="icon" aria-label="Zoom in">+</Button>
          <Button onClick={() => onAction("fit")} variant="secondary">Fit</Button>
        </Row>
        <Grid variant="editor-layout">
          <Stack variant="layers-panel">
            <Row>
              <Heading level={3}>Layers</Heading>
              <Spacer />
              <Badge>{data.layerCount}</Badge>
            </Row>
            <Text variant="caption">Top layers appear in front. Shift-click to select several on the canvas.</Text>
            {data.layers.map((item, i) => (
              <Button key={i} onClick={() => onAction("selectLayer")} item={item.id} variant={item.variant}>
                <Text>{item.label}</Text>
                <Badge tone={item.tone}>{item.kind}</Badge>
              </Button>
            ))}
            <Divider />
            <Button onClick={() => onAction("bringForward")} variant="secondary">Move forward</Button>
            <Button onClick={() => onAction("sendBackward")} variant="secondary">Move backward</Button>
            <Button onClick={() => onAction("toggleVisible")} variant="secondary">Show / hide layer</Button>
            <Button onClick={() => onAction("toggleLock")} variant="secondary">Lock / unlock layer</Button>
          </Stack>
          <Stack variant="canvas-area">
            <Section id="canvas-host" />
            <Row variant="page-strip">
              {data.pages.map((item, i) => (
                <Button key={i} onClick={() => onAction("page")} item={item.id} variant={item.variant}>{item.name}</Button>
              ))}
              <Button onClick={() => onAction("addPage")} variant="secondary" aria-label="Add page">+</Button>
            </Row>
            <Row>
              <Text variant="caption">{data.pageSize}</Text>
              <Spacer />
              <Button onClick={() => onAction("duplicatePage")} variant="secondary">Duplicate page</Button>
              <Button onClick={() => onAction("deletePage")} variant="secondary" disabled={data.singlePage}>Delete page</Button>
            </Row>
          </Stack>
          <Stack variant="properties-panel">
            <Heading level={3}>Design details</Heading>
            {data.hasSelection ? (
              <>
                <Badge tone={data.selectionTone}>{data.selectionKind}</Badge>
                <Text variant="caption">{data.selectionEvidence}</Text>
                <Field label="Layer name"><Input name="layerName" /></Field>
                {data.isText && (
                  <>
                    <Field label="Text"><Input name="text" multiline={true} /></Field>
                    <Field label="Font family"><Input name="fontFamily" /></Field>
                    <Field label="Font size"><Input name="fontSize" type="number" min={1} max={1000} /></Field>
                    <Select name="fontWeight" options={data.weights} aria-label="Font weight" />
                    <Select name="textAlign" options={data.alignments} aria-label="Text alignment" />
                  </>
                )}
                <Field label="Colour"><Input name="fill" type="color" /></Field>
                <Row>
                  <Field label="X"><Input name="left" type="number" /></Field>
                  <Field label="Y"><Input name="top" type="number" /></Field>
                </Row>
                <Row>
                  <Field label="Width"><Input name="objectWidth" type="number" min={1} /></Field>
                  <Field label="Height"><Input name="objectHeight" type="number" min={1} /></Field>
                </Row>
                <Row>
                  <Field label="Rotation"><Input name="angle" type="number" /></Field>
                  <Field label="Opacity %"><Input name="opacity" type="number" min={0} max={100} /></Field>
                </Row>
                <Button onClick={() => onAction("applyProperties")}>Apply changes</Button>
                {data.isImage && (
                  <Button onClick={() => onAction("replaceImage")} variant="secondary">Replace image</Button>
                )}
                <Button onClick={() => onAction("flatten")} variant="secondary">Flatten selected layer</Button>
              </>
            ) : (
              <Text variant="muted">Select a layer to change its words, colour or position. Drag the corner handles to resize.</Text>
            )}
            <Divider />
            <Field label="Page background"><Input name="background" type="color" /></Field>
            <Button onClick={() => onAction("background")} variant="secondary">Apply background</Button>
            <Button onClick={() => onAction("report")} variant="secondary">Import report</Button>
            <Button onClick={() => onAction("revisions")} variant="secondary">Saved versions</Button>
            <Button onClick={() => onAction("reconstruct")} variant="secondary">Reconstruct image</Button>
            <Button onClick={() => onAction("template")} variant="secondary">Save as template</Button>
            {data.hasDrive && (
              <Button onClick={() => onAction("driveSave")} variant="secondary">Save a copy to My Drive</Button>
            )}
          </Stack>
        </Grid>
      </Stack>
    </Page>
  )
}
