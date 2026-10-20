// Generated from screens/Compare.aui; edit the AUI source.
import { Alert, Badge, Button, Card, Field, Grid, Heading, Image, Input, Page, Row, Section, Select, Spacer, Stack, Text } from "@/components/ui"

export function Compare({ data, onAction }: { data: any; onAction: (name: string) => void }) {
  return (
    <Page>
      <Card variant="dialog-wide" aria-label="Compare imported design">
        <Alert tone="error">{data.error}</Alert>
        <Row>
          <Stack gap="xs">
            <Heading level={2}>A new beginning for your design</Heading>
            <Text variant="caption">{data.comparisonLabel}</Text>
          </Stack>
          <Spacer />
          <Button onClick={() => onAction("closeCompare")} variant="secondary" cancel={true}>Close</Button>
        </Row>
        <Row variant="compare-summary">
          <Badge tone="info">{data.pageCountLabel}</Badge>
          <Badge tone="success">{data.objectCountLabel}</Badge>
          <Badge tone="warning">{data.warningCountLabel}</Badge>
          <Select name="comparePage" options={data.comparePages} aria-label="Comparison page" />
          <Button onClick={() => onAction("compareRefresh")} variant="secondary">Show page</Button>
        </Row>
        <Grid columns={2} variant="comparison">
          <Stack gap="sm">
            <Heading level={3}>Original / source reference</Heading>
            <Image src={data.sourcePreview} alt="Source reference" />
          </Stack>
          <Stack gap="sm">
            <Heading level={3}>Editable reconstruction</Heading>
            <Image src={data.resultPreview} alt="Editable reconstruction" />
          </Stack>
        </Grid>
        <Field label="Overlay comparison"><Input name="overlay" type="range" min={0} max={100} /></Field>
        <Section variant="overlay">
          <Image src={data.sourcePreview} alt="Source under overlay" />
          <Image src={data.resultPreview} alt="Reconstruction overlay" variant="overlay-image" />
        </Section>
        <Text variant="caption">{data.differenceLabel}</Text>
        {data.warnings.map((item, i) => (
          <Alert key={i} tone="warning">{item}</Alert>
        ))}
        {data.missingFonts && (
          <>
            <Alert tone="warning">{data.missingFontLabel}</Alert>
            <Field label="Substitute all missing fonts with"><Input name="substituteFont" /></Field>
            <Button onClick={() => onAction("substituteFonts")} variant="secondary">Preview font substitution</Button>
          </>
        )}
        <Row>
          <Button onClick={() => onAction("acceptImport")}>Open in editor</Button>
          {data.canRerun && (
            <>
              <Select name="mode" options={data.modes} aria-label="Rerun mode" />
              <Button onClick={() => onAction("rerun")} variant="secondary">Rerun import</Button>
            </>
          )}
          <Button onClick={() => onAction("downloadReport")} variant="secondary">Download report</Button>
        </Row>
      </Card>
    </Page>
  )
}
