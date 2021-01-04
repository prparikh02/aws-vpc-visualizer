from enum import IntEnum
from typing import Dict, Tuple


class NodeType(IntEnum):
    SECURITY_GROUP = 0,
    CIDR_IP = 1,
    CIDR_IPV6 = 2,
    PREFIX_LIST = 3,


class EdgeDirection(IntEnum):
    IN = 0,
    OUT = 1,


class Dictable(object):
    def to_dict(self):
        pass


class Node(Dictable):
    def __init__(
            self,
            id_: str,
            type_: NodeType,
            name: str,
            metadata: Dict[str, str] = {},
    ) -> None:
        self._id = id_
        self._type = type_
        self._name = name
        self._metadata = metadata  # This is mutable :/

    @property
    def id(self):
        return self._id

    @property
    def type(self):
        return self._type

    @property
    def name(self):
        return self._name

    @property
    def metadata(self):
        return self._metadata
        # return {key: val for key, val in self._frozen_metadata}

    def to_dict(self):
        # Use the @property attributes
        return {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'metadata': self.metadata,
        }

    def __str__(self):
        return str(vars(self))

    def __repr__(self):
        return str(vars(self))


class Edge(Dictable):
    def __init__(
            self,
            source: str,
            target: str,
            protocol: str = None,
            port_range: Tuple[str, str] = None,
    ) -> None:
        self._source = source
        self._target = target
        self._protocol = protocol
        self._port_range = port_range

    @property
    def source(self):
        return self._source

    @property
    def target(self):
        return self._target

    @property
    def protocol(self):
        return self._protocol

    @property
    def port_range(self):
        return self._port_range

    def to_dict(self):
        # Use the @property attributes
        return {
            'source': self.source,
            'target': self.target,
            'protocol': self.protocol,
            'port_range': self.port_range,
        }

    def __eq__(self, other):
        if id(self) == id(other):
            return True
        if not isinstance(other, Edge):
            return False
        return (
            self._source == other._source and
            self._target == other._target and
            self._protocol == other._protocol and
            self._port_range == self._port_range
        )

    def __hash__(self):
        # Is this really the best way to do this? It doubles memory.
        return hash((
            self._source,
            self._target,
            self._protocol,
            self._port_range,
        ))

    def __str__(self):
        return str(vars(self))

    def __repr__(self):
        return str(vars(self))


class Graph(Dictable):
    def __init__(self, nodes, edges):
        self._nodes = nodes
        self._edges = edges

    @property
    def nodes(self):
        return self._nodes

    @property
    def edges(self):
        return self._edges

    def to_dict(self):
        # Use the @property attributes
        return {
            'nodes': self.nodes,
            'edges': self.edges,
        }
