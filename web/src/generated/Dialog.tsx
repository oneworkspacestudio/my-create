// Generated from screens/Dialog.aui; edit the AUI source.
import { Alert, Button, Card, Field, Heading, Input, Page, Row, Select, Spacer, Text } from "@/components/ui"

export function Dialog({ data, onAction }: { data: any; onAction: (name: string) => void }) {
  return (
    <Page>
      <Card variant="dialog" aria-label={data.dialogTitle}>
        <Alert tone="error">{data.error}</Alert>
        <Row>
          <Heading level={2}>{data.dialogTitle}</Heading>
          <Spacer />
          <Button onClick={() => onAction("closeDialog")} variant="icon" cancel={true} aria-label="Close dialog">×</Button>
        </Row>
        {data.newDialog && (
          <>
            <Field label="Design name"><Input name="newTitle" /></Field>
            <Row>
              <Field label="Width in pixels"><Input name="newWidth" type="number" min={1} max={16000} /></Field>
              <Field label="Height in pixels"><Input name="newHeight" type="number" min={1} max={16000} /></Field>
            </Row>
            <Button onClick={() => onAction("createBlank")}>Create design</Button>
          </>
        )}
        {data.exporting && (
          <>
            <Text>Download the current page, or keep every page editable in a portable project pack.</Text>
            <Button onClick={() => onAction("exportPNG")}>Download PNG</Button>
            <Button onClick={() => onAction("exportSVG")} variant="secondary">Download editable SVG</Button>
            <Button onClick={() => onAction("exportPDF")} variant="secondary">Print / save pages as PDF</Button>
            <Button onClick={() => onAction("exportPack")} variant="secondary">Download editable project pack</Button>
            <Button onClick={() => onAction("saveCopy")} variant="secondary">Save as a new project</Button>
          </>
        )}
        {data.templating && (
          <>
            <Text>Add attribution for the design and every included asset. This saves privately or downloads a pack. It never publishes your content automatically.</Text>
            <Field label="Licence (for example CC0-1.0 or Private)"><Input name="license" /></Field>
            <Field label="Author"><Input name="author" /></Field>
            <Field label="Attribution and asset licences"><Input name="attribution" multiline={true} /></Field>
            <Field label="Categories (comma separated)"><Input name="categories" /></Field>
            <Field label="Keywords (comma separated)"><Input name="keywords" /></Field>
            <Button onClick={() => onAction("saveTemplate")}>Save private template</Button>
            <Button onClick={() => onAction("downloadTemplate")} variant="secondary">Download template pack</Button>
          </>
        )}
        {data.showRevisions && (
          <>
            <Text>Opening an earlier version does not erase later versions. Save it as a copy to keep both.</Text>
            {data.revisions.map((item, i) => (
              <Row key={i}>
                <Text>{item.label}</Text>
                <Spacer />
                <Button onClick={() => onAction("openRevision")} item={item.revision} variant="secondary">Open as copy</Button>
              </Row>
            ))}
          </>
        )}
        {data.reconstructing && (
          <>
            <Alert tone="info">Reconstruction makes guesses from visible pixels. Inferred text and shapes start hidden until you review them in the layer panel. The original pixels are never erased.</Alert>
            <Button onClick={() => onAction("ocr")}>Recognize text with local Windows OCR</Button>
            <Text variant="caption">PNG/JPEG sources only. Uses installed Windows recognition languages. No model download.</Text>
            <Button onClick={() => onAction("shapes")} variant="secondary">Detect simple colour rectangles</Button>
          </>
        )}
        {data.showReport && (
          <>
            <Text>{data.reportSummary}</Text>
            {data.warnings.map((item, i) => (
              <Alert key={i} tone="warning">{item}</Alert>
            ))}
            <Button onClick={() => onAction("downloadReport")} variant="secondary">Download report</Button>
            <Button onClick={() => onAction("original")} variant="secondary" disabled={data.noSource}>Download preserved original</Button>
          </>
        )}
        {data.imageDialog && (
          <>
            <Input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" />
            <Button onClick={() => onAction("insertImage")}>Use image</Button>
          </>
        )}
        {data.driveDialog && (
          <>
            <Text>Files are read and written with your own My Drive permissions. Save creates a new copy with the original source inside the project pack.</Text>
            <Select name="driveSource" options={data.driveSources} aria-label="Drive source" />
            <Field label="Folder path"><Input name="drivePath" /></Field>
            <Button onClick={() => onAction("driveList")} variant="secondary">Open folder</Button>
            {data.driveFiles.map((item, i) => (
              <Row key={i}>
                <Text>{item.name}</Text>
                <Spacer />
                <Button onClick={() => onAction("driveChoose")} item={item.path} variant="secondary">{item.action}</Button>
              </Row>
            ))}
            {data.savingDrive && (
              <>
                <Field label="New project pack name"><Input name="driveName" /></Field>
                <Button onClick={() => onAction("driveWrite")}>Save new copy here</Button>
              </>
            )}
          </>
        )}
      </Card>
    </Page>
  )
}
