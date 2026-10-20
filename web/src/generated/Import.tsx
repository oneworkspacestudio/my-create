// Generated from screens/Import.aui; edit the AUI source.
import { Alert, Button, Card, Heading, Icon, Input, Page, Row, Section, Select, Spacer, Spinner, Text } from "@/components/ui"

export function Import({ data, onAction }: { data: any; onAction: (name: string) => void }) {
  return (
    <Page>
      <Card variant="dialog" aria-label="Import a design">
        <Alert tone="error">{data.error}</Alert>
        <Row>
          <Heading level={2}>Bring a design into My Create</Heading>
          <Spacer />
          <Button onClick={() => onAction("closeDialog")} variant="icon" cancel={true} aria-label="Close import">×</Button>
        </Row>
        <Text variant="muted">Choose a file you have permission to use. Your original is preserved, even if conversion cannot finish.</Text>
        <Section id="drop-zone" variant="drop-zone">
          <Icon name="Layers" />
          <Text>Drop a design here, or choose a file</Text>
          <Input name="importFile" type="file" accept=".svg,.pptx,.pdf,.png,.jpg,.jpeg,.webp,.psd,.mycreate,.zip" />
        </Section>
        <Select name="mode" options={data.modes} aria-label="Import mode" />
        <Text variant="caption">Smart Editable retains supported objects. Preserve Appearance keeps a raster reference and hidden extracted objects. Maximum Editability includes uncertain objects for review.</Text>
        <Text variant="caption">Up to 32 MiB · 60 pages · Processed on this device and your Workspace server</Text>
        <Row>
          <Button onClick={() => onAction("convert")}>Import and review</Button>
          {data.hasDrive && (
            <Button onClick={() => onAction("driveOpen")} variant="secondary">Choose from My Drive</Button>
          )}
        </Row>
        {data.converting && (
          <Row>
            <Spinner />
            <Text>{data.progress}</Text>
            <Button onClick={() => onAction("cancelImport")} variant="secondary" cancel={true}>Cancel</Button>
          </Row>
        )}
        <Alert tone="info">Canva designs: export SVG, PowerPoint or PDF from Canva, then choose that file here. Canva links and private catalogue assets are not imported.</Alert>
      </Card>
    </Page>
  )
}
